package cards

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/x509"
	"errors"
	"fmt"
	"math/big"
	"strings"

	"github.com/ThalesIgnite/crypto11"
	"github.com/miekg/pkcs11"
	"golang.org/x/crypto/cryptobyte"
	"golang.org/x/crypto/cryptobyte/asn1"
)

type Config struct {
	Path string
	PIN  string

	closer func() error
}

func New(path string, pin string) *Config {
	return &Config{
		Path: path,
		PIN:  pin,
	}
}

type Token struct {
	Label  string
	Serial string
}

func (ctx *Config) EnumerateTokens() ([]*Token, error) {
	p := pkcs11.New(ctx.Path)
	err := p.Initialize()
	if err != nil {
		return nil, fmt.Errorf("init: %w", err)
	}
	defer p.Destroy()
	defer p.Finalize()
	slots, err := p.GetSlotList(true)
	if err != nil {
		return nil, fmt.Errorf("get slots: %w", err)
	}
	var ret []*Token
	for _, slot := range slots {
		tinfo, err := p.GetTokenInfo(slot)
		if err != nil {
			return nil, fmt.Errorf("get token info: %w", err)
		}
		ret = append(ret, &Token{Label: tinfo.Label, Serial: tinfo.SerialNumber})
	}
	return ret, nil
}

// Filter Tokens given hint. If hint is "", then doesn't filter and return as is.
func (ctx *Config) FilterTokens(hint string, in []*Token) []*Token {
	if hint == "" {
		return in
	}
	var ret []*Token
	for i := range in {
		if strings.Contains(in[i].Label, hint) {
			ret = append(ret, in[i])
		}
	}
	return ret
}

func (ctx *Config) GetSigner(token *Token) (*x509.Certificate, *ecdsa.PublicKey, crypto.Signer, error) {
	pp, err := crypto11.Configure(&crypto11.Config{
		Path:       ctx.Path,
		Pin:        ctx.PIN,
		TokenLabel: token.Label,
	})
	if err != nil {
		return nil, nil, nil, fmt.Errorf("configure: %w", err)
	}
	ctx.closer = pp.Close
	certs, err := pp.FindAllPairedCertificates()
	if err != nil {
		return nil, nil, nil, fmt.Errorf("get certs: %w", err)
	}
	if len(certs) != 1 {
		return nil, nil, nil, fmt.Errorf("found more than one cert in slot")
	}
	cert := certs[0]
	priv, ok := cert.PrivateKey.(crypto11.Signer)
	if !ok {
		return nil, nil, nil, fmt.Errorf("cannot cast to signer")
	}
	pub, ok := priv.Public().(*ecdsa.PublicKey)
	if !ok {
		return nil, nil, nil, fmt.Errorf("cannot cast to verifier")
	}
	return cert.Leaf, pub, priv, nil
}

func (ctx *Config) Close() error {
	if ctx.closer == nil {
		return nil
	}
	err := ctx.closer()
	ctx.closer = nil
	return err
}

func UnmarshalSignature(sig []byte) (r, s *big.Int, err error) {
	var inner cryptobyte.String
	r, s = new(big.Int), new(big.Int)
	input := cryptobyte.String(sig)
	if !input.ReadASN1(&inner, asn1.SEQUENCE) ||
		!input.Empty() ||
		!inner.ReadASN1Integer(r) ||
		!inner.ReadASN1Integer(s) ||
		!inner.Empty() {
		return nil, nil, errors.New("invalid ASN.1")
	}
	return r, s, nil
}

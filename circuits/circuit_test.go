package circuits

import (
	"crypto"
	"crypto/x509"
	"math/big"
	"testing"

	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark/std/math/emulated"
	"github.com/consensys/gnark/std/math/uints"
	"github.com/consensys/gnark/std/signature/ecdsa"
	"github.com/consensys/gnark/test"
	"github.com/ritave/eIDAS-bridge/cards"
	"github.com/ritave/eIDAS-bridge/cert"
	"github.com/ritave/eIDAS-bridge/p384"
)

func TestCircuit(t *testing.T) {
	challenge := []byte("01234567890abcdef")
	stdcert, signer := getSigner(t)
	crt, err := cert.Unmarshal(stdcert.Raw)
	if err != nil {
		t.Fatal(err)
	}
	r, s := sign(t, signer, challenge)
	subject := getSubject(t, stdcert)
	rr, ss, err := cards.UnmarshalSignature(crt.SignatureValue.Bytes)
	if err != nil {
		t.Fatal(err)
	}

	circuit := &Circuit{}
	witness := &Circuit{
		Challenge: [16]uints.U8(uints.NewU8Array(challenge)),
		Subject:   [11]uints.U8(uints.NewU8Array(subject)),
		ChallengeSignature: ecdsa.Signature[p384.P384Fr]{
			R: emulated.ValueOf[p384.P384Fr](r),
			S: emulated.ValueOf[p384.P384Fr](s),
		},
		Certificate:    [502]uints.U8(uints.NewU8Array(stdcert.Raw)),
		TBSCertificate: [379]uints.U8(uints.NewU8Array(crt.TBSCertificate.Raw)),
		SubjectPubkey:  [97]uints.U8(uints.NewU8Array(crt.TBSCertificate.PublicKey.PublicKey.Bytes)),
		IssuerPubKey:   [97]uints.U8(uints.NewU8Array(crt.TBSCertificate.PublicKey.PublicKey.Bytes)),
		CertificateSignature: ecdsa.Signature[p384.P384Fr]{
			R: emulated.ValueOf[p384.P384Fr](rr),
			S: emulated.ValueOf[p384.P384Fr](ss),
		},
	}

	err = test.IsSolved(circuit, witness, ecc.BN254.ScalarField())
	if err != nil {
		t.Fatal(err)
	}
}

func getSigner(t *testing.T) (*x509.Certificate, crypto.Signer) {
	t.Helper()
	ctx := cards.New("/opt/homebrew/lib/opensc-pkcs11.so", "123456")
	tokens, err := ctx.EnumerateTokens()
	if err != nil {
		t.Fatal(err)
	}
	tokens = ctx.FilterTokens("PN", tokens)
	if len(tokens) != 1 {
		t.Fatal("not one token")
	}
	cert, _, priv, err := ctx.GetSigner(tokens[0])
	if err != nil {
		t.Fatal(err)
	}
	return cert, priv
}

func sign(t *testing.T, signer crypto.Signer, challenge []byte) (r, s *big.Int) {
	signature, err := signer.Sign(nil, challenge, nil)
	if err != nil {
		t.Fatal(err)
	}
	r, s, err = cards.UnmarshalSignature(signature)
	if err != nil {
		t.Fatal(err)
	}
	return r, s
}

func getSubject(t *testing.T, cert *x509.Certificate) []byte {
	t.Helper()
	return []byte(cert.Subject.CommonName)
}
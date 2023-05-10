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
	subPubkey := crt.TBSCertificate.PublicKey.PublicKey.Bytes
	issPubkey := crt.TBSCertificate.PublicKey.PublicKey.Bytes // selfsigned
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
		SubjectPubkey:  [97]uints.U8(uints.NewU8Array(subPubkey)),
		IssuerPubKey:   [97]uints.U8(uints.NewU8Array(issPubkey)),
		CertificateSignature: ecdsa.Signature[p384.P384Fr]{
			R: emulated.ValueOf[p384.P384Fr](rr),
			S: emulated.ValueOf[p384.P384Fr](ss),
		},
	}
	t.Log("SNARK witness created")

	t.Log("solving SNARK")
	err = test.IsSolved(circuit, witness, ecc.BN254.ScalarField())
	if err != nil {
		t.Fatal(err)
	}
}

func getSigner(t *testing.T) (*x509.Certificate, crypto.Signer) {
	t.Helper()
	ctx := cards.New("/opt/homebrew/lib/opensc-pkcs11.so", "123456")
	t.Log("enumerating smart cards")
	tokens, err := ctx.EnumerateTokens()
	if err != nil {
		t.Fatal(err)
	}
	tokens = ctx.FilterTokens("PN", tokens)
	if len(tokens) != 1 {
		t.Fatal("not one token")
	}
	t.Log("found token:", tokens[0].Label)
	cert, _, priv, err := ctx.GetSigner(tokens[0])
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("obtained certificate")
	return cert, priv
}

func sign(t *testing.T, signer crypto.Signer, challenge []byte) (r, s *big.Int) {
	t.Logf("creating signature for challenge: %s", challenge)
	signature, err := signer.Sign(nil, challenge, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("signature %x\n", signature)
	r, s, err = cards.UnmarshalSignature(signature)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("unmarshalled signature r=%s s=%s\n", r, s)
	return r, s
}

func getSubject(t *testing.T, cert *x509.Certificate) []byte {
	t.Helper()
	return []byte(cert.Subject.CommonName)
}

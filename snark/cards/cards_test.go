package cards

import (
	"crypto/ecdsa"
	"testing"
)

func TestGetSigner(t *testing.T) {
	msg := []byte("test msg")
	ctx := New("/opt/homebrew/lib/opensc-pkcs11.so", "123456")
	tokens, err := ctx.EnumerateTokens()
	if err != nil {
		t.Fatal(err)
	}
	tokens = ctx.FilterTokens("PN", tokens)
	if len(tokens) != 1 {
		t.Fatal("not one token")
	}
	cert, pub, priv, err := ctx.GetSigner(tokens[0])
	if err != nil {
		t.Fatal(err)
	}
	defer ctx.Close()
	signature, err := priv.Sign(nil, msg, nil)
	if err != nil {
		t.Fatal(err)
	}
	r, s, err := UnmarshalSignature(signature)
	if err != nil {
		t.Fatal(err)
	}
	if !ecdsa.VerifyASN1(pub, msg, signature) {
		t.Error("asn1 not verified")
	}
	if !ecdsa.Verify(pub, msg, r, s) {
		t.Error("r,s not verified")
	}
	_ = cert
}

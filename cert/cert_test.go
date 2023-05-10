package cert

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/pem"
	"os"
	"testing"
)

func TestVerify(t *testing.T) {
	bts, err := os.ReadFile("../cert.pem")
	if err != nil {
		t.Fatal(err)
	}
	d, rest := pem.Decode(bts)
	if len(rest) != 0 {
		t.Fatal("rest")
	}
	cert, err := x509.ParseCertificate(d.Bytes)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("%x\n", cert.Raw)
	cp := x509.NewCertPool()
	cp.AddCert(cert)
	chains, err := cert.Verify(x509.VerifyOptions{Roots: cp})
	t.Log(err)
	t.Log(chains)
	msg := cert.RawTBSCertificate
	digest := sha256.Sum256(msg)
	pub, ok := cert.PublicKey.(*ecdsa.PublicKey)
	if !ok {
		t.Fatal("pub")
	}
	if !ecdsa.VerifyASN1(pub, digest[:], cert.Signature) {
		t.Error("not valid")
	}

	_ = cert
}

func TestMarshalRound(t *testing.T) {
	bts, err := os.ReadFile("../cert.pem")
	if err != nil {
		t.Fatal(err)
	}
	d, rest := pem.Decode(bts)
	if len(rest) != 0 {
		t.Fatal("rest")
	}
	c, err := Unmarshal(d.Bytes)
	if err != nil {
		t.Fatal("unmarshal")
	}
	dd, err := Marshal(c)
	if err != nil {
		t.Fatal("marshal", err)
	}
	if !bytes.Equal(dd, d.Bytes) {
		t.Fatal("not equal")
	}
	t.Logf("%x\n", c.TBSCertificate.PublicKey.PublicKey.Bytes)
	t.Logf("%s\n", c.TBSCertificate.Subject.FullBytes)
}

func TestAssertSubject(t *testing.T) {
	bts, err := os.ReadFile("../cert.pem")
	if err != nil {
		t.Fatal(err)
	}
	d, rest := pem.Decode(bts)
	if len(rest) != 0 {
		t.Fatal("rest")
	}
	if !AssertSubject(d.Bytes, "PN:11223344", 134) {
		t.Fatal("not subject")
	}
}

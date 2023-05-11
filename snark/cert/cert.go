package cert

import (
	"bytes"
	"crypto/x509/pkix"
	"encoding/asn1"
	"fmt"
	"math/big"
	"time"
)

// Signed certificate
type X509Certificate struct {
	TBSCertificate     TBSCertificate
	SignatureAlgorithm pkix.AlgorithmIdentifier
	SignatureValue     asn1.BitString
}

// To Be Signed
type TBSCertificate struct {
	Raw                asn1.RawContent
	Version            int `asn1:"optional,explicit,default:0,tag:0"`
	SerialNumber       *big.Int
	SignatureAlgorithm pkix.AlgorithmIdentifier
	Issuer             asn1.RawValue
	Validity           Validity
	Subject            asn1.RawValue
	PublicKey          PublicKeyInfo
	UniqueId           asn1.BitString   `asn1:"optional,tag:1"`
	SubjectUniqueId    asn1.BitString   `asn1:"optional,tag:2"`
	Extensions         []pkix.Extension `asn1:"omitempty,optional,explicit,tag:3"`
}

type Validity struct {
	NotBefore, NotAfter time.Time
}

type PublicKeyInfo struct {
	Raw       asn1.RawContent
	Algorithm pkix.AlgorithmIdentifier
	PublicKey asn1.BitString
}

func Unmarshal(der []byte) (*X509Certificate, error) {
	var ret X509Certificate
	rest, err := asn1.Unmarshal(der, &ret)
	if err != nil {
		return nil, fmt.Errorf("asn1: %w", err)
	}
	if len(rest) != 0 {
		return nil, fmt.Errorf("nonzero rest")
	}
	return &ret, nil
}

func Marshal(cert *X509Certificate) ([]byte, error) {
	return asn1.Marshal(*cert)
}

func AssertSubject(certbytes []byte, subject string, offset int) bool {
	return bytes.Equal(certbytes[offset+2:offset+2+len(subject)], []byte(subject))
}

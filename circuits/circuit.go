package circuits

import (
	"fmt"

	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/std/math/uints"
	"github.com/consensys/gnark/std/signature/ecdsa"
	"github.com/ritave/eIDAS-bridge/p384"
)

func AssertCertificate(api frontend.API, certificate []uints.U8, subject []uints.U8, pubkey []uints.U8) error {
	uapi, err := uints.New[uints.U32](api)
	if err != nil {
		return err
	}
	if len(subject) != 11 {
		return fmt.Errorf("subject length invalid")
	}
	if len(pubkey) != 98 {
		return fmt.Errorf("pubkey length invalid")
	}
	for i := range subject {
		uapi.ByteAssertEq(certificate[136+i], subject[i])
	}
	for i := range pubkey {
		uapi.ByteAssertEq(certificate[200+i], pubkey[i]) // or 201?
	}
	return nil
}

func SubjectPublicKey(api frontend.API, pubkey []uints.U8) ecdsa.PublicKey[p384.P384Fp, p384.P384Fr] {
	panic("TODO")
}

func BytesToPubkey(api frontend.API, pubkey []uints.U8) ecdsa.PublicKey[p384.P384Fp, p384.P384Fr] {
	panic("TODO")
}

type Circuit struct {
	Challenge [16]uints.U8 // signed by the smart card. Used by the smart contract to ensure liveness
	Subject   [11]uints.U8 // this is used in smart contract to mint identity NFT

	ChallengeSignature ecdsa.Signature[p384.P384Fr] `gnark:",secret"`

	Certificate    [502]uints.U8 `gnark:",secret"` // full certificate with signature
	TBSCertificate [379]uints.U8 `gnark:",secret"` // only the CSR part of the certificate for digest

	// these we could theoretically parse from the certificate using hints
	// in-circuit but until gnark doesn't provide hints for byte arrays do
	// externally and only validate correctness.
	SubjectPubkey [97]uints.U8 `gnark:",secret"`
	IssuerPubKey  [97]uints.U8 `gnark:",secret"` // right now self-signed

	CertificateSignature ecdsa.Signature[p384.P384Fr] `gnark:",secret"`
}

func (c *Circuit) Define(api frontend.API) error {
	// 1. assert that subject and pub key bytes are in the certificate at correct locations
	AssertCertificate(api, c.TBSCertificate[:], c.Subject[:], c.SubjectPubkey[:])
	// 2. convert IssuerPubKey into ecdsa.PublicKey
	// 3. hash TBSCertificate with SHA256 to get digest
	// 4. check that digest verifies with CertificateSignature
	// 5. check that CertificateSignature is properly encoded in Certificate
	// 6. convert SubjectPubKey into ecdsa.PublicKey
	// 7. check that Challenge verifies with SubjectPubKey and ChallengeSignature

	return nil
}

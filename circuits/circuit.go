package circuits

import (
	"fmt"

	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/std/hash/sha2"
	"github.com/consensys/gnark/std/math/emulated"
	"github.com/consensys/gnark/std/math/uints"
	"github.com/consensys/gnark/std/signature/ecdsa"
	"github.com/ritave/eIDAS-bridge/p384"
)

func AssertCertSubjectPubkey(uapi *uints.BinaryField[uints.U32], certificate []uints.U8, subject []uints.U8, pubkey []uints.U8) error {
	if len(subject) != 11 {
		return fmt.Errorf("subject length invalid")
	}
	if len(pubkey) != 97 {
		return fmt.Errorf("pubkey length invalid")
	}
	for i := range subject {
		uapi.ByteAssertEq(certificate[136+i], subject[i])
	}
	for i := range pubkey {
		uapi.ByteAssertEq(certificate[201+i], pubkey[i]) // or 201?
	}
	return nil
}

func AssertCertificateSignature(uapi *uints.BinaryField[uints.U32], fullcert []uints.U8, signature []uints.U8) error {
	if len(signature) != 102 {
		return fmt.Errorf("signature length invalid")
	}
	for i := range signature {
		uapi.ByteAssertEq(fullcert[400+i], signature[i])
	}
	return nil
}

func byteArrayToLimbs(api frontend.API, array []uints.U8) ([]frontend.Variable, error) {
	if len(array) != 48 {
		return nil, fmt.Errorf("input not 48")
	}
	ret := make([]frontend.Variable, 6)
	for i := range ret {
		ret[i] = api.Add(
			api.Mul(1<<0, array[6*i+0]),
			api.Mul(1<<8, array[6*i+1]),
			api.Mul(1<<16, array[6*i+2]),
			api.Mul(1<<24, array[6*i+3]),
			api.Mul(1<<32, array[6*i+4]),
			api.Mul(1<<40, array[6*i+5]),
			api.Mul(1<<48, array[6*i+6]),
			api.Mul(1<<56, array[6*i+7]),
		)
	}
	return ret, nil
}

func BytesToPubkey(api frontend.API, pubkey []uints.U8) (*ecdsa.PublicKey[p384.P384Fp, p384.P384Fr], error) {
	xb, err := byteArrayToLimbs(api, pubkey[2:50])
	if err != nil {
		return nil, fmt.Errorf("xb: %w", err)
	}
	yb, err := byteArrayToLimbs(api, pubkey[50:98])
	if err != nil {
		return nil, fmt.Errorf("yb: %w", err)
	}
	var pub ecdsa.PublicKey[p384.P384Fp, p384.P384Fr]
	efp, err := emulated.NewField[p384.P384Fp](api)
	if err != nil {
		return nil, fmt.Errorf("field: %w", err)
	}
	pub.X = *efp.NewElement(xb)
	pub.Y = *efp.NewElement(yb)
	return &pub, nil
}

func BytesToMessage(api frontend.API, dgst []uints.U8) *emulated.Element[p384.P384Fr] {
	panic("TODO")
}

func SignatureToBytes(api frontend.API, signature *ecdsa.Signature[p384.P384Fr]) []uints.U8 {
	// 02 31 R 02 31 S
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
	uapi, err := uints.New[uints.U32](api)
	if err != nil {
		return err
	}
	// 1. assert that subject and pub key bytes are in TBS certificate at correct locations
	if err := AssertCertSubjectPubkey(uapi, c.TBSCertificate[:], c.Subject[:], c.SubjectPubkey[:]); err != nil {
		return err
	}
	// 2. convert IssuerPubKey into ecdsa.PublicKey
	issuerKey, err := BytesToPubkey(api, c.IssuerPubKey[:])
	if err != nil {
		return err
	}
	// 3. hash TBSCertificate with SHA256 to get digest
	hasher, err := sha2.New(api)
	if err != nil {
		return err
	}
	hasher.Write(c.TBSCertificate[:])
	dgst := hasher.Sum()
	// 4. check that digest verifies with CertificateSignature
	dgstS := BytesToMessage(api, dgst)
	issuerKey.Verify(api, p384.GetP384Params(), dgstS, &c.CertificateSignature)
	// 5. check that CertificateSignature is properly encoded in Certificate
	certSig := SignatureToBytes(api, &c.CertificateSignature)
	if err := AssertCertificateSignature(uapi, c.Certificate[:], certSig); err != nil {
		return err
	}
	// 6. convert SubjectPubKey into ecdsa.PublicKey
	subKey, err := BytesToPubkey(api, c.SubjectPubkey[:])
	if err != nil {
		return err
	}
	// 7. check that Challenge verifies with SubjectPubKey and ChallengeSignature
	challengeS := BytesToMessage(api, c.Challenge[:])
	subKey.Verify(api, p384.GetP384Params(), challengeS, &c.ChallengeSignature)
	return nil
}

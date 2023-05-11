package circuits

import (
	"fmt"

	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/std/hash/sha2"
	"github.com/consensys/gnark/std/math/bits"
	"github.com/consensys/gnark/std/math/emulated"
	"github.com/consensys/gnark/std/math/uints"
	"github.com/consensys/gnark/std/signature/ecdsa"
	"github.com/ritave/eIDAS-bridge/snark/p384"
)

func AssertCertSubjectPubkey(uapi *uints.BinaryField[uints.U32], tbsCertificate []uints.U8, subject []uints.U8, pubkey []uints.U8) error {
	if len(subject) != 11 {
		return fmt.Errorf("subject length invalid")
	}
	if len(pubkey) != 97 {
		return fmt.Errorf("pubkey length invalid")
	}
	for i := range subject {
		uapi.ByteAssertEq(tbsCertificate[132+i], subject[i])
	}
	for i := range pubkey {
		uapi.ByteAssertEq(tbsCertificate[197+i], pubkey[i])
	}
	return nil
}

func AssertCertificateSignature(uapi *uints.BinaryField[uints.U32], fullcert []uints.U8, signature []uints.U8) error {
	if len(signature) != 100 {
		return fmt.Errorf("signature length invalid")
	}
	for i := range signature {
		uapi.ByteAssertEq(fullcert[400+i], signature[i])
	}
	return nil
}

func byteArrayToLimbs(api frontend.API, array []uints.U8) ([]frontend.Variable, error) {
	ret := make([]frontend.Variable, (len(array)+7)/8)
	ap := make([]uints.U8, 8*len(ret)-len(array))
	for i := range ap {
		ap[i] = uints.NewU8(0)
	}
	array = append(ap, array...)
	for i := range ret {
		ret[len(ret)-1-i] = api.Add(
			api.Mul(1<<0, array[8*i+7].Val),
			api.Mul(1<<8, array[8*i+6].Val),
			api.Mul(1<<16, array[8*i+5].Val),
			api.Mul(1<<24, array[8*i+4].Val),
			api.Mul(1<<32, array[8*i+3].Val),
			api.Mul(1<<40, array[8*i+2].Val),
			api.Mul(1<<48, array[8*i+1].Val),
			api.Mul(1<<56, array[8*i+0].Val),
		)
	}
	return ret, nil
}

func BytesToPubkey(api frontend.API, pubkey []uints.U8) (*ecdsa.PublicKey[p384.P384Fp, p384.P384Fr], error) {
	xb, err := byteArrayToLimbs(api, pubkey[1:49])
	if err != nil {
		return nil, fmt.Errorf("xb: %w", err)
	}
	yb, err := byteArrayToLimbs(api, pubkey[49:97])
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

func BytesToMessage(api frontend.API, dgst []uints.U8) (*emulated.Element[p384.P384Fr], error) {
	mb, err := byteArrayToLimbs(api, dgst)
	if err != nil {
		return nil, fmt.Errorf("mb: %w", err)
	}
	efp, err := emulated.NewField[p384.P384Fr](api)
	if err != nil {
		return nil, fmt.Errorf("field: %w", err)
	}
	nbPost := 6 - len(mb)
	for i := 0; i < nbPost; i++ {
		mb = append(mb, 0)
	}
	m := efp.NewElement(mb)
	return m, nil
}

func SignatureToBytes(api frontend.API, signature *ecdsa.Signature[p384.P384Fr]) ([]uints.U8, error) {
	// 02 31 R 02 31 S
	efr, err := emulated.NewField[p384.P384Fr](api)
	if err != nil {
		return nil, fmt.Errorf("field %w", err)
	}
	uapi, err := uints.New[uints.U32](api)
	if err != nil {
		return nil, fmt.Errorf("uints: %w", err)
	}
	rbits := efr.ToBits(&signature.R)
	sbits := efr.ToBits(&signature.S)
	res := make([]uints.U8, 4+2*48)
	res[0] = uints.NewU8(0x02)
	res[1] = uints.NewU8(0x31)
	res[50] = uints.NewU8(0x02)
	res[51] = uints.NewU8(0x31)
	for i := 0; i < 48; i++ {
		rbt := bits.FromBinary(api, rbits[i*8:(i+1)*8], bits.WithUnconstrainedInputs())
		res[2+i] = uapi.ByteValueOf(rbt)
		sbt := bits.FromBinary(api, sbits[i*8:(i+1)*8], bits.WithUnconstrainedInputs())
		res[50+i] = uapi.ByteValueOf(sbt)
	}
	return res, nil
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
	// 0. assert that TBS is correctly extracted from X509
	// 1. assert that subject and pub key bytes are in TBS certificate at correct locations
	if err := AssertCertSubjectPubkey(uapi, c.TBSCertificate[:], c.Subject[:], c.SubjectPubkey[:]); err != nil {
		return fmt.Errorf("assert cert: %w", err)
	}
	// 2. convert IssuerPubKey into ecdsa.PublicKey
	issuerKey, err := BytesToPubkey(api, c.IssuerPubKey[:])
	if err != nil {
		return fmt.Errorf("issuer key: %w", err)
	}
	// 3. hash TBSCertificate with SHA256 to get digest
	hasher, err := sha2.New(api)
	if err != nil {
		return err
	}
	hasher.Write(c.TBSCertificate[:])
	dgst := hasher.Sum()
	// 4. check that digest verifies with CertificateSignature
	dgstS, err := BytesToMessage(api, dgst)
	if err != nil {
		return fmt.Errorf("dgst msg: %w", err)
	}
	issuerKey.Verify(api, p384.GetP384Params(), dgstS, &c.CertificateSignature)
	// 5. check that CertificateSignature is properly encoded in Certificate
	certSig, err := SignatureToBytes(api, &c.CertificateSignature)
	if err != nil {
		return fmt.Errorf("sig to bytes: %w", err)
	}
	if err := AssertCertificateSignature(uapi, c.Certificate[:], certSig); err != nil {
		return fmt.Errorf("cert sig: %w", err)
	}
	// 6. convert SubjectPubKey into ecdsa.PublicKey
	subKey, err := BytesToPubkey(api, c.SubjectPubkey[:])
	if err != nil {
		return fmt.Errorf("subkey: %w", err)
	}
	// 7. check that Challenge verifies with SubjectPubKey and ChallengeSignature
	challengeS, err := BytesToMessage(api, c.Challenge[:])
	if err != nil {
		return fmt.Errorf("challenge: %w", err)
	}
	subKey.Verify(api, p384.GetP384Params(), challengeS, &c.ChallengeSignature)
	return nil
}

// for MVP
type FCircuit struct {
	ChallengeSignature ecdsa.Signature[p384.P384Fr]              `gnark:",secret"`
	SubjectPubkey      ecdsa.PublicKey[p384.P384Fp, p384.P384Fr] `gnark:",secret"`
	Challenge          [32]uints.U8                              `gnark:",public"` // signed by the smart card. Used by the smart contract to ensure liveness
}

func (c *FCircuit) Define(api frontend.API) error {
	challengeS, err := BytesToMessage(api, c.Challenge[:])
	if err != nil {
		return fmt.Errorf("challenge: %w", err)
	}
	c.SubjectPubkey.Verify(api, p384.GetP384Params(), challengeS, &c.ChallengeSignature)
	return nil
}

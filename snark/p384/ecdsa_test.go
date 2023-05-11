package p384

import (
	stdecdsa "crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"testing"

	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/std/math/emulated"
	"github.com/consensys/gnark/std/signature/ecdsa"
	"github.com/consensys/gnark/test"
)

type EcdsaCircuit[T, S emulated.FieldParams] struct {
	Sig ecdsa.Signature[S]
	Msg emulated.Element[S]
	Pub ecdsa.PublicKey[T, S]
}

func (c *EcdsaCircuit[T, S]) Define(api frontend.API) error {
	c.Pub.Verify(api, GetP384Params(), &c.Msg, &c.Sig)
	return nil
}

func TestECDSAP384(t *testing.T) {
	assert := test.NewAssert(t)
	priv, err := stdecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	assert.NoError(err)
	pub := priv.PublicKey
	msg := []byte("test")
	r, s, err := stdecdsa.Sign(rand.Reader, priv, msg)
	assert.NoError(err)

	circuit := EcdsaCircuit[P384Fp, P384Fr]{}
	witness := EcdsaCircuit[P384Fp, P384Fr]{
		Sig: ecdsa.Signature[P384Fr]{
			R: emulated.ValueOf[P384Fr](r),
			S: emulated.ValueOf[P384Fr](s),
		},
		Msg: emulated.ValueOf[P384Fr](msg),
		Pub: ecdsa.PublicKey[P384Fp, P384Fr]{
			X: emulated.ValueOf[P384Fp](pub.X),
			Y: emulated.ValueOf[P384Fp](pub.Y),
		},
	}
	err = test.IsSolved(&circuit, &witness, ecc.BN254.ScalarField())
	assert.NoError(err)
}

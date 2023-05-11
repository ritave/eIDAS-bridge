package p384

import "math/big"

var (
	qP384, rP384 *big.Int
)

func init() {
	qP384, _ = new(big.Int).SetString("fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff", 16)
	rP384, _ = new(big.Int).SetString("ffffffffffffffffffffffffffffffffffffffffffffffffc7634d81f4372ddf581a0db248b0a77aecec196accc52973", 16)
}

type P384Fp struct{}

func (fp P384Fp) NbLimbs() uint     { return 6 }
func (fp P384Fp) BitsPerLimb() uint { return 64 }
func (fp P384Fp) IsPrime() bool     { return true }
func (fp P384Fp) Modulus() *big.Int { return qP384 }

type P384Fr struct{}

func (fr P384Fr) NbLimbs() uint     { return 6 }
func (fr P384Fr) BitsPerLimb() uint { return 64 }
func (fr P384Fr) IsPrime() bool     { return true }
func (fr P384Fr) Modulus() *big.Int { return rP384 }

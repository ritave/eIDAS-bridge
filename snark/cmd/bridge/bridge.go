package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"flag"
	"fmt"
	"math/big"
	"os"
	"time"

	"github.com/consensys/gnark-crypto/ecc"
	"github.com/consensys/gnark/backend"
	"github.com/consensys/gnark/backend/groth16"
	"github.com/consensys/gnark/constraint/solver"
	"github.com/consensys/gnark/frontend"
	"github.com/consensys/gnark/frontend/cs"
	"github.com/consensys/gnark/logger"
	"github.com/consensys/gnark/std/math/emulated"
	"github.com/consensys/gnark/std/math/uints"
	"github.com/consensys/gnark/std/signature/ecdsa"
	"github.com/ritave/eIDAS-bridge/snark/cards"
	"github.com/ritave/eIDAS-bridge/snark/circuits"
	"github.com/ritave/eIDAS-bridge/snark/p384"
)

var libLoc string
var ccsLoc string
var pkLoc string
var vkLoc string

func init() {
	logger.Disable()
}

func main() {
	flag.StringVar(&libLoc, "opensc", "/opt/homebrew/lib/opensc-pkcs11.so", "location of opensc library")
	flag.StringVar(&ccsLoc, "system", "EIDAS.G16.ccs", "location of SNARK circuit")
	flag.StringVar(&pkLoc, "pkey", "EIDAS.G16.pk", "location of proving key")
	flag.StringVar(&vkLoc, "vkey", "EIDAS.G16.vk", "location of verifying key")
	flag.Parse()
	var tokens []*cards.Token
	var err error
	fccs, err := os.Open(ccsLoc)
	if err != nil {
		fmt.Println("CCSF", err)
		return
	}
	defer fccs.Close()

	fpk, err := os.Open(pkLoc)
	if err != nil {
		fmt.Println("PKF", err)
		return
	}
	defer fpk.Close()

	fvk, err := os.Open(vkLoc)
	if err != nil {
		fmt.Println("VKF", err)
		return
	}
	defer fvk.Close()

	ctx := cards.New(libLoc, "")

	for {
		tokens, err = ctx.EnumerateTokens()
		_ = err
		if len(tokens) == 0 {
			time.Sleep(1 * time.Second)
			continue
		}
		if len(tokens) > 1 {
			tokens = ctx.FilterTokens("PIN1", tokens) // TODO: or PIN 1?
		}
		if len(tokens) == 1 {
			break
		}
	}
	fmt.Println("{ \"id\": \"INSERTED\" }")
	pin := ""
	_, err = fmt.Scanln(&pin)
	if err != nil {
		fmt.Println(err)
		return
	}
	challenge := ""
	_, err = fmt.Scanln(&challenge)
	if err != nil {
		fmt.Println(err)
		return
	}
	ctx.SetPIN(pin)
	_, pub, priv, err := ctx.GetSigner(tokens[0])
	if err != nil {
		fmt.Println(err)
		return
	}
	challengebts := append([]byte(challenge), make([]byte, 32-len(challenge))...)
	signature, err := priv.Sign(nil, challengebts, nil)
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println("{ \"id\": \"SIGNED\" }")
	r, s, err := cards.UnmarshalSignature(signature)
	if err != nil {
		fmt.Println(err)
		return
	}
	assignment := circuits.FCircuit{
		Challenge: [32]uints.U8(uints.NewU8Array(make([]uint8, 32))),
		ChallengeSignature: ecdsa.Signature[p384.P384Fr]{
			R: emulated.ValueOf[p384.P384Fr](r),
			S: emulated.ValueOf[p384.P384Fr](s),
		},
		SubjectPubkey: ecdsa.PublicKey[p384.P384Fp, p384.P384Fr]{
			X: emulated.ValueOf[p384.P384Fp](pub.X),
			Y: emulated.ValueOf[p384.P384Fp](pub.Y),
		},
	}
	copy(assignment.Challenge[:], uints.NewU8Array(challengebts))
	ccs := groth16.NewCS(ecc.BN254)
	_, err = ccs.ReadFrom(fccs)
	if err != nil {
		fmt.Println("CCS", err)
		return
	}
	pk := groth16.NewProvingKey(ecc.BN254)
	_, err = pk.ReadFrom(fpk)
	if err != nil {
		fmt.Println("PK", err)
		return
	}
	vk := groth16.NewVerifyingKey(ecc.BN254)
	_, err = vk.ReadFrom(fvk)
	if err != nil {
		fmt.Println("VK", err)
		return
	}
	witness, err := frontend.NewWitness(&assignment, ecc.BN254.ScalarField())
	if err != nil {
		fmt.Println(err)
		return
	}

	// prove
	proof, err := groth16.Prove(ccs, pk, witness, backend.WithSolverOptions(solver.OverrideHint(
		solver.GetHintID(cs.Bsb22CommitmentComputePlaceholder), func(mod *big.Int, input, output []*big.Int) error {
			toHash := make([]byte, 0, (1+mod.BitLen()/8)*len(input))
			for _, in := range input {
				inBytes := in.Bytes()
				toHash = append(toHash, inBytes[:]...)
			}
			hsh := sha256.New().Sum(toHash)
			output[0].SetBytes(hsh)
			output[0].Mod(output[0], mod)
			return nil
		})))
	if err != nil {
		fmt.Println(err)
		return
	}
	// ensure gnark (Go) code verifies it
	publicWitness, err := witness.Public()
	if err != nil {
		fmt.Println(err)
		return
	}
	if err = groth16.Verify(proof, vk, publicWitness); err != nil {
		fmt.Println(err)
		return
	}
	// get proof bytes
	const fpSize = 4 * 8
	var buf bytes.Buffer
	proof.WriteRawTo(&buf)
	proofBytes := buf.Bytes()
	resp := Response{
		A: [2]*big.Int{
			new(big.Int).SetBytes(proofBytes[fpSize*0 : fpSize*1]),
			new(big.Int).SetBytes(proofBytes[fpSize*1 : fpSize*2]),
		},
		B: [2][2]*big.Int{
			[2]*big.Int{
				new(big.Int).SetBytes(proofBytes[fpSize*2 : fpSize*3]),
				new(big.Int).SetBytes(proofBytes[fpSize*3 : fpSize*4]),
			},
			[2]*big.Int{
				new(big.Int).SetBytes(proofBytes[fpSize*4 : fpSize*5]),
				new(big.Int).SetBytes(proofBytes[fpSize*5 : fpSize*6]),
			},
		},
		C: [2]*big.Int{
			new(big.Int).SetBytes(proofBytes[fpSize*6 : fpSize*7]),
			new(big.Int).SetBytes(proofBytes[fpSize*7 : fpSize*8]),
		},
	}
	for i := range assignment.Challenge {
		resp.Input[i] = new(big.Int).SetUint64(uint64(assignment.Challenge[i].Val.(uint8)))
	}
	tosend, err := json.Marshal(Message{"GENERATED", resp})
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(string(tosend))
}

type Response struct {
	A     [2]*big.Int
	B     [2][2]*big.Int
	C     [2]*big.Int
	Input [32]*big.Int
}

type Message struct {
	ID    string   `json:"id"`
	Proof Response `json:"proof"`
}

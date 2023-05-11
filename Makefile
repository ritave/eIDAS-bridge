contract/Verifier.abi:
	solc --abi contract/EIDAS.G16.sol -o build

contract/Verifier.bin:
	solc --bin contract/EIDAS.G16.sol -o build

verifier/verifier.go: contract/Verifier.abi contract/Verifier.bin
	abigen --abi contract/Verifier.abi --pkg verifier --type Verifier --out verifier/verifier.go --bin contract/Verifier.bin

.PHONY: clean
clean:
	rm -f contract/Verifier.abi contract/Pairing.abi contract/Verifier.bin contract/Pairing.bin verifier/verifier.go

.PHONY: all
all: verifier/verifier.go
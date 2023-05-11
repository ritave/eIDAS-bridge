contract/EIDAS.G16.sol:
	go run github.com/ritave/eIDAS-bridge/cmd/contract generate

contract/Verifier.abi: contract/EIDAS.G16.sol
	solc --overwrite --abi contract/EIDAS.G16.sol -o contract/build

contract/Verifier.bin: contract/EIDAS.G16.sol
	solc --overwrite --bin contract/EIDAS.G16.sol -o contract/build

verifier/verifier.go: contract/Verifier.abi contract/Verifier.bin
	abigen --abi contract/build/Verifier.abi --pkg verifier --type Verifier --out verifier/verifier.go --bin contract/build/Verifier.bin

.PHONY: cleansol
cleansol:
	rm -f contract/EIDAS.G16.ccs  contract/EIDAS.G16.pk   contract/EIDAS.G16.sol  contract/EIDAS.G16.vk

.PHONY: cleanabi
cleanabi:
	rm -f contract/Verifier.abi contract/Pairing.abi contract/Verifier.bin contract/Pairing.bin verifier/verifier.go

.PHONY: all
all: verifier/verifier.go

.PHONY: test
test: verifier/verifier.go
	go run github.com/ritave/eIDAS-bridge/cmd/contract test
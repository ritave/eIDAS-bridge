# eIDAS-bridge

## Local build

```
brew install openssl yubico-piv-tool opensc pcsc-lite
```

## Yubikey preparation

Generate key:

    yubico-piv-tool -agenerate -s 9c -A ECCP384 -o pubkey.pem --pin-policy=once --touch-policy=always

Create a self-signed certificate (replace code after PN with your fake ID-code): (TODO: writeout doesnt work right now?)

    yubico-piv-tool -a verify-pin -a selfsign -s 9c -i pubkey.pem -S /CN=PN:11223344/OU=EU/O=citizen/ -- serial 1 --valid-days 14 -o cert.pem

Import the selfsigned certificate to Yubikey:
    
    yubico-piv-tool -a import-certificate -s 9c -i cert.pem


package main

import (
	"testing"
)

func TestRun(t *testing.T) {
	ev, err := setup()
	if err != nil {
		t.Fatal(err)
	}
	if err := run(ev); err != nil {
		t.Fatal(err)
	}
}

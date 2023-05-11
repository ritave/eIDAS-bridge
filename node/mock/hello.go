package main

import (
	"fmt"
	"time"
)

func sleep() {
	h, _ := time.ParseDuration("2s500ms");
	time.Sleep(h);
}

func main() {
  //fmt.Println("{ status: \"waiting\" }")
	sleep();
	fmt.Println("{ \"id\": \"INSERTED\" }");
	pin := ""
	_, err := fmt.Scanln(&pin);
	if (err != nil) {
		fmt.Println(err);
	}
	challenge := ""
	_, err = fmt.Scanln(&challenge);
	if (err != nil) {
		fmt.Println(err);
	}
	//sleep();
	//fmt.Println("{ status: \"signing\" }");
	sleep();
	fmt.Println("{ \"id\": \"SIGNED\" }");
	sleep();
	fmt.Printf("{ \"id\": \"GENERATED\", \"proof\": \"foobar - %s - %s\" }\n", pin, challenge)
}
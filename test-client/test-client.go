package main

import (
	"bytes"
	"encoding/binary"
	"io"
	"os"
)

func main() {
	buffer := bytes.NewBuffer([]byte{})
	io.Copy(buffer, os.Stdin)
	binary.Write(os.Stdout, binary.LittleEndian, uint32(buffer.Len()))
	os.Stdout.Write(buffer.Bytes())
}

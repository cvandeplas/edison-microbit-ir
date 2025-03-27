// Copyright 2025 Christophe Vandeplas
// AGPL License v3

// reuse of MIT licensed code from https://github.com/1010Technologies/pxt-makerbit-ir-transmitter/blob/master/infrared-transmitter.ts
// implements the Edison protocol as described here: https://meetedison.com/content/support/Edison_Infrared_Communication_Protocol.pdf

//% color=#0fbc11 icon="\u272a" block="Edison"
//% category="Edison"
namespace edison {
  let irLed: InfraredLed;

  class InfraredLed {
      private pin: AnalogPin;
      private waitCorrection: number;

      constructor(pin: AnalogPin) {
          this.pin = pin;
          pins.analogWritePin(this.pin, 0);
          pins.analogSetPeriod(this.pin, 26);

          // Measure the time we need for a minimal bit (analogWritePin and waitMicros)
          {
              const start = input.runningTimeMicros();
              const runs = 32;
              for (let i = 0; i < runs; i++) {
                  this.transmitBit(1, 1);
              }
              const end = input.runningTimeMicros();
              this.waitCorrection = Math.idiv(end - start - runs * 2, runs * 2);
          }

          // out of curiosity, show the waitcorrection - ususally about 33 - 34
          // basic.showNumber(this.waitCorrection)

          // Insert a pause between callibration and first message
          control.waitMicros(2000);
      }

      /**
       * Sends a pulse of IR at 38kHz for a given duration.
       * @param highMicros the duration of the pulse in microseconds
       * @param lowMicros the duration of the pause after the pulse
       */
      public transmitBit(highMicros: number, lowMicros: number): void {
          pins.analogWritePin(this.pin, 511); // IR LED ON (50% duty cycle)
          control.waitMicros(highMicros);     // duration of LED ON
          pins.analogWritePin(this.pin, 1);   // IR LED OFF
          control.waitMicros(lowMicros);      // pause
      }

      /**
       * Sends an IR message using the Edison protocol.
       * @param data number <= 255 to send.
       */
      public sendEd(data: number): void {
          if (data < 0 || data > 255) {
              // Value out of range (0-255) due to Edison limitations.
              return;
          }

          // Prepare Inverted Data (ID) and Normal Data (D) - and only keep <= 255
          let invertedData = (~data) & 0xFF;
          let normalData = data & 0xFF;

          const ED_PULSE_START = 5000 - this.waitCorrection + 50;       // A data transmission always begins with a 5,000uS start pulse followed by a 1T space.
          const ED_PULSE_1 = ( 2 * 600 ) - this.waitCorrection + 50;    // 1 pulses are 2T space - 1200µs - compensate rise time of bit
          const ED_PULSE_0 = 600 - this.waitCorrection + 50;            // 0 pulses are 1T space - 600µs  - compensate rise time of bit
          const ED_PULSE_PAUSE = 600 - this.waitCorrection - 50;        // pulses always pause for 1T space - 600µs - compensate time to lower the bit

          // Send Start Bit (5000µs ON, 600µs OFF)
          this.transmitBit(ED_PULSE_START, ED_PULSE_PAUSE);

          // Send 8 bits of Inverted Data (ID)
          for (let i = 0; i < 8; i++) {
              let bit = (invertedData >> (7 - i)) & 1;
              if (bit) {
                  this.transmitBit(ED_PULSE_1, ED_PULSE_PAUSE);
              } else {
                  this.transmitBit(ED_PULSE_0, ED_PULSE_PAUSE);
              }
          }

          // Send 8 bits of Normal Data (D)
          for (let i = 0; i < 8; i++) {
              let bit = (normalData >> (7 - i)) & 1;
              if (bit) {
                  this.transmitBit(ED_PULSE_1, ED_PULSE_PAUSE);
              } else {
                  this.transmitBit(ED_PULSE_0, ED_PULSE_PAUSE);
              }
          }

      }
  }

  /**
   * Connects to the IR-emitting LED at the specified pin.
   * @param pin IR LED pin, eg: AnalogPin.P0
   */
  //% subcategory="IR Sender"
  //% blockId="edison_infrared_sender_connect"
  //% block="connect IR sender LED at pin %pin"
  //% pin.fieldEditor="gridpicker"
  //% pin.fieldOptions.columns=4
  //% pin.fieldOptions.tooltips="false"
  //% weight=90
  export function connectIrSenderLed(pin: AnalogPin): void {
      irLed = new InfraredLed(pin);
  }

  /**
   * Sends a number using the Edison IR protocol.
   * @param number a number <= 255, eg: 42
   */
  //% subcategory="IR Sender"
  //% blockId="edison_infrared_sender_send_number"
  //% block="send IR number %number"
  //% weight=80
  export function sendIrNumber(data: number): void {
      if (!irLed) {
          return;
      }
      irLed.sendEd(data);
  }

}
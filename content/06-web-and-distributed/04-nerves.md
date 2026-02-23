---
title: "Nerves"
description: "Build embedded systems and IoT devices with Nerves, the Elixir platform for hardware. Covers firmware, GPIO, networking with VintageNet, and OTA updates via NervesHub."
weight: 4
phase: 6
lesson: 29
difficulty: "advanced"
estimatedMinutes: 25
draft: false
date: 2025-02-23
prerequisites:
  - "/06-web-and-distributed/03-ecto"
hexdocsLinks:
  - title: "Nerves Project"
    url: "https://hexdocs.pm/nerves/getting-started.html"
  - title: "Nerves.GPIO"
    url: "https://hexdocs.pm/circuits_gpio/Circuits.GPIO.html"
  - title: "NervesHub"
    url: "https://hexdocs.pm/nerves_hub_link/readme.html"
  - title: "VintageNet"
    url: "https://hexdocs.pm/vintage_net/readme.html"
tags:
  - nerves
  - iot
  - embedded
  - hardware
  - gpio
  - firmware
---

Nerves brings Elixir to embedded systems. It lets you write firmware for devices like Raspberry Pi, BeagleBone, and other ARM-based boards using the same language and OTP patterns you already know. Nerves produces minimal, self-contained firmware images that boot in seconds and leverage the BEAM's fault-tolerance for devices that need to run unattended for months or years.

## What Is Nerves?

Nerves is a complete platform for building embedded systems in Elixir. It consists of three major components:

- **Nerves Platform** -- A minimal Linux-based system customized for each target board. It strips away everything unnecessary and boots directly into the BEAM.
- **Nerves Tooling** -- Mix tasks for cross-compiling, building firmware images, and burning them to SD cards or deploying over the network.
- **Nerves Libraries** -- Elixir packages for GPIO, I2C, SPI, networking, and more.

{{< concept title="Why Elixir for Embedded?" >}}
Embedded devices face unique challenges: they must be reliable (no one can restart them), they must handle failures gracefully, and they often need to communicate over networks. These are exactly the problems the BEAM was designed to solve. OTP supervision trees restart crashed processes automatically, pattern matching makes protocol parsing clean, and lightweight processes handle concurrent sensor inputs naturally. Nerves combines this runtime reliability with Elixir's productivity to make embedded development surprisingly pleasant.
{{< /concept >}}

## Target Hardware

Nerves supports a range of hardware targets. Each target has a corresponding system package:

```elixir
# mix.exs -- select the target system
defp deps do
  [
    {:nerves, "~> 1.10", runtime: false},
    {:nerves_system_rpi4, "~> 1.24", runtime: false, targets: :rpi4},
    {:nerves_system_rpi3, "~> 1.24", runtime: false, targets: :rpi3},
    {:nerves_system_bbb, "~> 1.24", runtime: false, targets: :bbb},
    {:nerves_system_rpi0, "~> 1.24", runtime: false, targets: :rpi0}
  ]
end
```

Common supported targets include:

| Target | Board | Use Case |
|--------|-------|----------|
| `rpi4` | Raspberry Pi 4 | General purpose, networking, media |
| `rpi3` | Raspberry Pi 3 | General purpose, WiFi built-in |
| `rpi0` | Raspberry Pi Zero | Low-power, minimal footprint |
| `bbb` | BeagleBone Black | Industrial, many I/O pins |
| `x86_64` | Generic x86_64 | Testing on regular PCs |

## Getting Started

Install the Nerves tooling and create a new project:

```bash
# Install the Nerves bootstrap archive
mix archive.install hex nerves_bootstrap

# Create a new Nerves project
mix nerves.new blinky
cd blinky

# Set your target (e.g., Raspberry Pi 4)
export MIX_TARGET=rpi4

# Fetch dependencies (cross-compiled for the target)
mix deps.get

# Build the firmware image
mix firmware

# Burn to an SD card
mix burn
```

{{< callout type="warning" >}}
Nerves cross-compiles your Elixir code along with a minimal Linux system for your target hardware. You need to set `MIX_TARGET` before fetching dependencies, since many dependencies compile native code for the specific architecture. If you switch targets, run `mix deps.get` again.
{{< /callout >}}

## Project Structure

A Nerves project looks similar to a standard Mix project with a few additions:

```text
blinky/
  config/
    config.exs        # Shared configuration
    host.exs          # Configuration when running on your dev machine
    target.exs        # Configuration when running on the target device
  lib/
    blinky/
      application.ex  # OTP application with device-specific children
      led.ex          # Hardware interaction module
  rootfs_overlay/     # Files to include in the firmware filesystem
  test/
  mix.exs
```

The `config/target.exs` file contains device-specific configuration like network settings and firmware metadata:

```elixir
# config/target.exs
import Config

config :blinky, target: Mix.target()

config :nerves, :firmware,
  rootfs_overlay: "rootfs_overlay"

# Configure networking
config :vintage_net,
  regulatory_domain: "US",
  config: [
    {"usb0", %{type: VintageNetDirect}},
    {"eth0", %{type: VintageNetEthernet, ipv4: %{method: :dhcp}}},
    {"wlan0",
     %{
       type: VintageNetWiFi,
       vintage_net_wifi: %{
         networks: [
           %{
             key_mgmt: :wpa_psk,
             ssid: System.get_env("WIFI_SSID"),
             psk: System.get_env("WIFI_PSK")
           }
         ]
       },
       ipv4: %{method: :dhcp}
     }}
  ]
```

## GPIO -- Controlling Hardware

The `circuits_gpio` library gives you direct control over GPIO (General Purpose Input/Output) pins. This is how you blink LEDs, read buttons, and interface with sensors:

```elixir
defmodule Blinky.LED do
  use GenServer

  alias Circuits.GPIO

  def start_link(pin_number) do
    GenServer.start_link(__MODULE__, pin_number, name: __MODULE__)
  end

  @impl true
  def init(pin_number) do
    {:ok, gpio} = GPIO.open(pin_number, :output)
    schedule_toggle()
    {:ok, %{gpio: gpio, on: false}}
  end

  @impl true
  def handle_info(:toggle, %{gpio: gpio, on: on} = state) do
    new_state = !on
    GPIO.write(gpio, if(new_state, do: 1, else: 0))
    schedule_toggle()
    {:noreply, %{state | on: new_state}}
  end

  defp schedule_toggle do
    Process.send_after(self(), :toggle, 500)
  end
end
```

For reading input:

```elixir
defmodule Blinky.Button do
  use GenServer

  alias Circuits.GPIO

  def start_link(pin_number) do
    GenServer.start_link(__MODULE__, pin_number, name: __MODULE__)
  end

  @impl true
  def init(pin_number) do
    {:ok, gpio} = GPIO.open(pin_number, :input)
    GPIO.set_interrupts(gpio, :both)
    {:ok, %{gpio: gpio}}
  end

  @impl true
  def handle_info({:circuits_gpio, _pin, _timestamp, value}, state) do
    case value do
      1 -> IO.puts("Button pressed!")
      0 -> IO.puts("Button released!")
    end
    {:noreply, state}
  end
end
```

{{% compare %}}
```elixir
# Elixir/Nerves -- OTP-supervised GPIO
defmodule Blinky.Application do
  use Application

  def start(_type, _args) do
    children = [
      {Blinky.LED, 18},      # GPIO pin 18
      {Blinky.Button, 24},   # GPIO pin 24
      {Blinky.Sensor, [sda: 2, scl: 3]}
    ]

    Supervisor.start_link(children,
      strategy: :one_for_one,
      name: Blinky.Supervisor
    )
  end
end
```

```python
# Python/RPi.GPIO -- no supervision, manual cleanup
import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
GPIO.setup(18, GPIO.OUT)

try:
    while True:
        GPIO.output(18, GPIO.HIGH)
        time.sleep(0.5)
        GPIO.output(18, GPIO.LOW)
        time.sleep(0.5)
except KeyboardInterrupt:
    GPIO.cleanup()  # Must remember cleanup
```
{{% /compare %}}

## Networking on Embedded

Nerves uses `VintageNet` for all network configuration. You can manage WiFi, Ethernet, and cellular connections programmatically:

```elixir
# Check current network status
VintageNet.get_by_prefix(["interface", "wlan0"])

# Configure WiFi at runtime
VintageNet.configure("wlan0", %{
  type: VintageNetWiFi,
  vintage_net_wifi: %{
    networks: [
      %{
        key_mgmt: :wpa_psk,
        ssid: "MyNetwork",
        psk: "my_password"
      }
    ]
  },
  ipv4: %{method: :dhcp}
})

# Check connectivity
VintageNet.get(["interface", "wlan0", "connection"])
# :internet  -- fully connected
# :lan       -- local network only
# :disconnected
```

{{< iex >}}
iex> VintageNet.info()
Interface wlan0
  Type: VintageNetWiFi
  Power: on
  Connection: :internet
  Addresses: 192.168.1.42/24
  MAC: b8:27:eb:12:34:56
iex> VintageNet.get(["interface", "wlan0", "addresses"])
[%{address: {192, 168, 1, 42}, prefix_length: 24, family: :inet}]
{{< /iex >}}

## Firmware Updates with NervesHub

NervesHub provides over-the-air (OTA) firmware updates for your devices. Once your device is connected, you can push new firmware without physical access:

```elixir
# In mix.exs dependencies
{:nerves_hub_link, "~> 2.2"}

# In your application supervision tree
children = [
  # ... other children
  NervesHubLink
]
```

Deploying updates is done through the NervesHub CLI or web interface:

```bash
# Create a firmware signing key
mix nerves_hub.key create my_key

# Upload firmware to NervesHub
mix nerves_hub.firmware publish --key my_key

# Create a deployment that targets devices
mix nerves_hub.deployment create \
  --name production \
  --firmware 1.0.1 \
  --tag "location:office" \
  --version ">= 1.0.0"
```

{{< callout type="tip" >}}
Nerves uses an A/B partition scheme for firmware updates. The running firmware stays on partition A while the new firmware is written to partition B. If the new firmware fails to boot, the device automatically reverts to the previous working firmware on partition A. This makes OTA updates safe even on remote, unattended devices.
{{< /callout >}}

## Putting It Together -- A Sensor Node

Here is a complete example of a Nerves application that reads a temperature sensor, publishes data over MQTT, and exposes a simple web interface using Phoenix:

```elixir
defmodule SensorNode.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      # Read temperature sensor every 5 seconds
      {SensorNode.TemperatureReader, interval: 5_000},
      # Publish readings via MQTT
      {SensorNode.MqttPublisher, broker: "mqtt://broker.local"},
      # Serve a local dashboard
      {Bandit, plug: SensorNode.Router, port: 80},
      # Status LED -- blink pattern indicates state
      {SensorNode.StatusLED, pin: 18}
    ]

    opts = [strategy: :one_for_one, name: SensorNode.Supervisor]
    Supervisor.start_link(children, opts)
  end
end

defmodule SensorNode.TemperatureReader do
  use GenServer

  alias Circuits.I2C

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def current_reading do
    GenServer.call(__MODULE__, :current)
  end

  @impl true
  def init(opts) do
    interval = Keyword.get(opts, :interval, 5_000)
    {:ok, i2c} = I2C.open("i2c-1")
    schedule_read(interval)
    {:ok, %{i2c: i2c, interval: interval, reading: nil}}
  end

  @impl true
  def handle_info(:read, state) do
    reading = read_sensor(state.i2c)
    Phoenix.PubSub.broadcast(SensorNode.PubSub, "readings", {:new_reading, reading})
    schedule_read(state.interval)
    {:noreply, %{state | reading: reading}}
  end

  @impl true
  def handle_call(:current, _from, state) do
    {:reply, state.reading, state}
  end

  defp read_sensor(i2c) do
    {:ok, <<temp_raw::16>>} = I2C.write_read(i2c, 0x48, <<0x00>>, 2)
    temp_raw * 0.0625
  end

  defp schedule_read(interval) do
    Process.send_after(self(), :read, interval)
  end
end
```

{{< exercise title="Design a Nerves Application" >}}
Design (on paper or in code) a Nerves application for a smart garden monitor:

1. Define an OTP application supervision tree that manages:
   - A soil moisture sensor reader (I2C, read every 10 seconds)
   - A water pump controller (GPIO output)
   - A WiFi connection manager
   - A data publisher (sends readings to a cloud API)

2. Write a GenServer for the pump controller that:
   - Accepts `{:water, duration_ms}` casts to run the pump for a specified duration
   - Automatically turns off the pump after the duration elapses
   - Tracks total water usage

3. Design the logic that triggers watering when moisture drops below a threshold
4. Consider: What happens if the WiFi goes down? What if the sensor returns bad data? How does OTP supervision help here?

**Bonus:** Sketch out how NervesHub would handle deploying a firmware update that changes the moisture threshold from 30% to 25%.
{{< /exercise >}}

## Summary

Nerves brings the full power of Elixir and OTP to embedded systems. The BEAM's reliability -- supervision trees, process isolation, hot code upgrades -- solves the hardest problems in embedded development: devices that must run unattended, recover from failures automatically, and accept updates over the network. With libraries like `circuits_gpio` for hardware interaction, `VintageNet` for networking, and `NervesHub` for OTA updates, Nerves provides a complete platform for building production IoT devices in Elixir.

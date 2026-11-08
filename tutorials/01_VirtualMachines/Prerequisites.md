
# :books: Required software for the Cloud Computing course

**LINFO2145 Autumn, 2024** -- *Etienne Rivière, Yinan Cao, Paul-Edouard Bertrand Van Ouytsel and Clément Delzotti*

# Overview

We use [Multipass](https://multipass.run/), a software distributed by Canonical, to create and manage Ubuntu VMs on top of your computer. Multipass allows you to deploy in a fast and convenient way **Ubuntu** VMs on any architecture. Even tho you are limited with the Ubuntu distribution, you can configure the version of Ubuntu as well as other hardware specification: CPU, memory, network, disk, ...

:bulb:
Instructions for the installation of Multipass on Linux, MacOS, and Windows can be found on the [official website](https://multipass.run/install).

You can ensure that Multipass is correctly installed by running `multipass help` on your favorite terminal.

# Windows users

Multipass uses Hyper-V, available only on Windows Pro and Business, to deploy and manage virtual machines. 
The official alternative is to use VirtualBox as the VM manager.
Before installing Multipass, make sure that you have VirtualBox installed on your computer and that your local network is designated as **private**, as explained on the [official website](https://multipass.run/install#tab-two__content).
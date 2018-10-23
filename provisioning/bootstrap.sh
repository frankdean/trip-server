#!/usr/bin/env bash

apt-get update
apt-get upgrade --yes
apt-get install --yes g++ git nginx postgresql postgresql-contrib apg screen apt-transport-https

curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
apt-get update
apt-get install --yes yarn+ cmdtest- nodejs-

NODE_VERSION="v6.14.4"
NODE_FILENAME="node-${NODE_VERSION}-linux-x64"
NODE_TAR_FILENAME="${NODE_FILENAME}.tar.xz"
NODE_SHA256="66d052fe10f90e3b05fdda3117f26bc24da10d436eecf6e298c317f437647aab  ${NODE_TAR_FILENAME}"
NODE_EXTRACT_DIR="${NODE_FILENAME}"
NODE_DOWNLOAD_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_TAR_FILENAME}"

if [ ! -d "/usr/local/share/${NODE_FILENAME}" ]; then
	if [ ! -e "/vagrant/provisioning/downloads/${NODE_TAR_FILENAME}" ]; then
		if [ ! -d /vagrant/provisioning/downloads ]; then
			mkdir -p /vagrant/provisioning/downloads
		fi
		cd /vagrant/provisioning/downloads
		wget --no-verbose $NODE_DOWNLOAD_URL 2>&1
		echo "$NODE_SHA256" | shasum -c -
		if [ $? -ne "0" ]; then
			>&2 echo "Checksum of downloaded file does not match expected value of ${NODE_SHA256}"
			exit 1
		fi
	fi
	if [ -e "/vagrant/provisioning/downloads/${NODE_TAR_FILENAME}" ]; then
		cd /vagrant/provisioning/downloads
		echo "$NODE_SHA256" | shasum -c -
		if [ $? -ne "0" ]; then
			>&2 echo "Checksum of downloaded file does not match expected value of ${NODE_SHA256}"
			exit 1
		fi
		cd /usr/local/share
		tar --no-same-owner --no-same-permissions -xf "/vagrant/provisioning/downloads/${NODE_TAR_FILENAME}"
		if [ -L /usr/local/share/node-current ]; then
		    rm -f /usr/local/share/node-current
		fi
		ln -s "$NODE_EXTRACT_DIR" node-current
		cd  /usr/local/bin
		ln -s ../share/node-current/bin/node
		#ln -s ../share/node-current/bin/npm
		cd /usr/local/include
		ln -s ../share/node-current/include/node/
		cd /usr/local/lib
		ln -s ../share/node-current/lib/node_modules/
		mkdir -p /usr/local/share/doc
		cd /usr/local/share/doc
		ln -s ../node-current/share/doc/node/
		mkdir -p /usr/local/share/man/man1/
		cd /usr/local/share/man/man1/
		ln -s ../../node-current/share/man/man1/node.1
		cd /usr/local/share/
		mkdir -p systemtap/tapset
		cd systemtap/tapset
		ln -s ../../node-current/share/systemtap/tapset/node.stp
	fi
	if [ -e /vagrant/node_modules ]; then
		cd /vagrant
		rm -rf node_modules
	fi
fi

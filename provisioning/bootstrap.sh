#!/usr/bin/env bash

apt-get update
apt-get install -y g++ git nginx postgresql postgresql-contrib apg

NODE_VERSION="v6.10.3"
NODE_FILENAME="node-${NODE_VERSION}-linux-x64"
NODE_TAR_FILENAME="${NODE_FILENAME}.tar.xz"
NODE_EXTRACT_DIR="${NODE_FILENAME}"
NODE_DOWNLOAD_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_TAR_FILENAME}"

if [ ! -d /usr/local/share/node-v6.10.1-linux-x64 ]; then
	if [ ! -e "/vagrant/provisioning/downloads/${NODE_TAR_FILENAME}" ]; then
		if [ ! -d /vagrant/provisioning/downloads ]; then
			mkdir -p /vagrant/provisioning/downloads
		fi
		cd /vagrant/provisioning/downloads
		wget --no-verbose $NODE_DOWNLOAD_URL 2>&1
	fi
	if [ -e "/vagrant/provisioning/downloads/${NODE_TAR_FILENAME}" ]; then
		cd /usr/local/share
		tar --no-same-owner --no-same-permissions -xf "/vagrant/provisioning/downloads/${NODE_TAR_FILENAME}"
		ln -s "$NODE_EXTRACT_DIR" node-current
		cd  /usr/local/bin
		ln -s ../share/node-current/bin/node
		ln -s ../share/node-current/bin/npm
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
	npm install bower -g
	if [ -e /vagrant/node_modules ]; then
		cd /vagrant
		rm -rf node_modules
	fi
fi

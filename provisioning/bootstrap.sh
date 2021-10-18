#!/usr/bin/env bash

# Uncomment the following to debug the script
#set -x

export DEBIAN_FRONTEND=noninteractive
DEB_OPTIONS="--yes"
apt-get update
apt-get upgrade $DEB_OPTIONS

sed -i -e 's/# en_GB.UTF-8 UTF-8/en_GB.UTF-8 UTF-8/' /etc/locale.gen
locale-gen
export LANG=en_GB.utf8
localedef -i en_GB -c -f UTF-8 -A /usr/share/locale/locale.alias en_GB.UTF-8
update-locale LANG=en_GB.UTF-8 LANGUAGE

ln -fs /usr/share/zoneinfo/Europe/London /etc/localtime
apt-get install -y tzdata
dpkg-reconfigure tzdata

apt-get install apt-transport-https
apt-get install $DEB_OPTIONS g++ git nginx postgresql postgresql-contrib postgis apg screen

if [ "$VB_GUI" == "y" ]; then
	apt-get install -y lxde
fi
if [ "$TRIP_DEV" == "y" ]; then
	apt-get install -y openjdk-11-jdk chromium chromium-l10n firefox-esr-l10n-en-gb vim
fi

curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
apt-get update
apt-get install $DEB_OPTIONS yarn+ cmdtest- nodejs-

NODE_VERSION="v12.22.7"
NODE_FILENAME="node-${NODE_VERSION}-linux-x64"
NODE_TAR_FILENAME="${NODE_FILENAME}.tar.xz"
NODE_SHA256=2768bc01d2f97ab8135b8c03b275b9689573964b426b5dd9082334fd70dcc583
NODE_EXTRACT_DIR="${NODE_FILENAME}"
NODE_DOWNLOAD_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_TAR_FILENAME}"

if [ ! -d "/usr/local/share/${NODE_FILENAME}" ]; then
	if [ ! -e "/vagrant/provisioning/downloads/${NODE_TAR_FILENAME}" ]; then
		if [ ! -d /vagrant/provisioning/downloads ]; then
			mkdir -p /vagrant/provisioning/downloads
		fi
		cd /vagrant/provisioning/downloads
		wget --no-verbose $NODE_DOWNLOAD_URL 2>&1
		echo "$NODE_SHA256  $NODE_TAR_FILENAME" | shasum -c -
		if [ $? -ne "0" ]; then
			>&2 echo "Checksum of downloaded file does not match expected value of ${NODE_SHA256}"
			exit 1
		fi
	fi
	if [ -e "/vagrant/provisioning/downloads/${NODE_TAR_FILENAME}" ]; then
		cd /vagrant/provisioning/downloads
		echo "$NODE_SHA256  $NODE_TAR_FILENAME" | shasum -c -
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
		ln -s ../share/node-current/bin/npm
		ln -s ../share/node-current/bin/npx
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

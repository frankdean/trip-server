#!/usr/bin/env bash

# Uncomment following line to import test data.  If VM already exists, perform
# 'vagrant ssh' into VM and drop the database with 'dropdb trip'.  It'll be
# recreated when your run 'vagrant reload' from the VM's host.
#IMPORT_TEST_DATA=y

# Uncomment the following to debug the script
#set -x

su - postgres -c 'createuser -drs vagrant' 2>/dev/null
su - vagrant -c 'cd /vagrant && npm install'
cd /vagrant
if [ -e config.json ]; then
	SECRET=$(grep '"uri"' /vagrant/config.json | cut -d ':' -f 4 | cut -d '@' -f 1)
else
	SECRET=$(apg  -m 12 -x 14 -M NC -t -n 20 | tail -n 1 | cut -d ' ' -f 1 -)
	SIGNING_KEY=$(apg  -m 12 -x 14 -M NC -t -n 20 | tail -n 1 | cut -d ' ' -f 1 -)
	UMASK=$(umask -p)
	umask o-rwx
	cp config-dist.json config.json
	$UMASK

	sed "s/\"signingKey\".*/\"signingKey\": \"${SIGNING_KEY}\"/; s/\"maxAge\": *[0-9]\+/\"maxAge\": 999/; s/\"host\": *\".*\", */\"host\": \"localhost\",/; s/\"path\": *\".*\", *$/\"path\": \"\/DO_NOT_FETCH_TILES_IN_DEMO_UNTIL_PROPERLY_CONFIGURED\/{z}\/{x}\/{y}.png\",/; s/\"uri\": *\".*\"/\"uri\": \"postgresql:\/\/trip:${SECRET}@localhost\/trip\"/; s/\"allow\":.*/\"allow\": false/; s/\"level\": *\"info\"/\"level\": \"debug\"/" /vagrant/config-dist.json >/vagrant/config.json

fi

if [ -d /etc/postgresql/9.4 ]; then
	egrep 'local\s+trip\s+trip\s+md5' /etc/postgresql/9.4/main/pg_hba.conf >/dev/null 2>&1
	if [ $? -ne 0 ]; then
		sed -i 's/local\(.*all.*all.*$\)/local   trip            trip                                    md5\nlocal\1/' /etc/postgresql/9.4/main/pg_hba.conf
		systemctl reload postgresql
	fi
elif [ -d /etc/postgresql/9.5 ]; then
	egrep 'local\s+trip\s+trip\s+md5' /etc/postgresql/9.5/main/pg_hba.conf >/dev/null 2>&1
	if [ $? -ne 0 ]; then
		sed -i 's/local\(.*all.*all.*$\)/local   trip            trip                                    md5\nlocal\1/' /etc/postgresql/9.5/main/pg_hba.conf
		systemctl reload postgresql
	fi
fi
cd /vagrant/spec/support
su - postgres -c 'createdb trip' 2>/dev/null
if [ $? -eq 0 ]; then
	su - postgres -c 'psql trip' <schema.sql >/dev/null
	su - postgres -c 'psql trip' >/dev/null 2>&1 <<EOF
CREATE ROLE trip_role;
EOF
	su - postgres -c  'psql trip' <permissions.sql >/dev/null
	# Create Test Data
	if [ "$IMPORT_TEST_DATA" == "y" ]; then
		su - postgres -c  'psql trip' <test-data.sql >/dev/null
	else
		ADMIN_PWD_TEXT=$(apg  -m 12 -x 14 -M NC -t -n 20 | tail -n 1)
		ADMIN_PWD=$(echo $ADMIN_PWD_TEXT | cut -d ' ' -f 1 -)
		su - postgres -c  'psql trip' <waypoint_symbols.sql >/dev/null
		su - postgres -c  'psql trip' <track_colors.sql >/dev/null
		su - postgres -c 'psql trip' >/dev/null <<EOF
CREATE EXTENSION pgcrypto;
INSERT INTO role (name) VALUES ('Admin'), ('User');
WITH upd AS (INSERT INTO usertable (firstname, lastname, email, uuid, password, nickname) VALUES ('admin', 'admin', 'admin@secret.org', '224ea8e1-d534-4ba7-bc55-b0a63fe56e52', crypt('$ADMIN_PWD', gen_salt('bf')), 'admin') RETURNING id) INSERT INTO user_role (user_id, role_id) SELECT upd.id, r.id AS role_id FROM upd, role as r WHERE name='Admin';
EOF
	fi
fi
su - postgres -c 'createuser trip' 2>/dev/null
if [ $? -eq 0 ]; then
	su - postgres -c 'dropuser trip'
	echo "CREATE USER trip PASSWORD '$SECRET' NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT" | su - postgres -c psql
	su - postgres -c 'psql trip' <<EOF
GRANT trip_role TO trip;
EOF
fi

if [ ! -e /etc/nginx/conf.d/trip.conf ]; then
	cp /vagrant/provisioning/nginx/conf.d/trip.conf /etc/nginx/conf.d/
fi
if [ ! -e /etc/nginx/sites-available/trip ]; then
	cp /vagrant/provisioning/nginx/sites-available/trip /etc/nginx/sites-available
fi
cd /etc/nginx/sites-enabled
if [ -e default ]; then
	rm -f default
	ln -fs ../sites-available/trip
	systemctl reload nginx
fi
if [ ! -d /var/www/trip ]; then
	mkdir /var/www/trip
fi
chown vagrant.vagrant /var/www/trip
if [ ! -e /var/www/trip/index.html ]; then
	cd /var/www/trip
	ln -s /vagrant/provisioning/nginx/index.html
fi
if [ ! -e /var/www/trip/app/bower_components ]; then
	if [ -f /vagrant-trip-web-client/package.json ]; then
		echo "Configuring web client to use shared folder under /vagrant-trip-web-client/"
		cd /var/www/trip
		if [ ! -L app ]; then
			ln -s /vagrant-trip-web-client/app
		fi
		if [ ! -d /vagrant-trip-web-client/node_modules ]; then
			su - vagrant -c 'cd /vagrant-trip-web-client && npm install'
		fi
	elif [ -f /vagrant/trip-web-client/package.json ]; then
		echo "Configuring to run with web application under /vagrant/trip-web-client/"
		cd /var/www/trip
		if [ ! -L app ]; then
			ln -s /vagrant/trip-web-client/app
		fi
		if [ ! -d /vagrant/trip-web-client/node_modules ]; then
			su - vagrant -c 'cd /vagrant/trip-web-client && npm install'
		fi
	else
		echo "Configuring to run with a downloaded version of the web application"
		TRIP_WEB_CLIENT_VERSION='v0.11.6'
		TRIP_WEB_CLIENT_RELEASE="trip-release-${TRIP_WEB_CLIENT_VERSION}.tar.gz"
		# If not, download and extract release
		if [ ! -e /vagrant/provisioning/downloads/${TRIP_WEB_CLIENT_RELEASE} ]; then
			cd /vagrant/provisioning/downloads
			wget --no-verbose https://github.com/frankdean/trip-web-client/releases/download/${TRIP_WEB_CLIENT_VERSION}/${TRIP_WEB_CLIENT_RELEASE} 2>&1
		fi
		cd /var/www/trip
		tar --no-same-owner --no-same-permissions -xf /vagrant/provisioning/downloads/${TRIP_WEB_CLIENT_RELEASE}
	fi
fi

if [ ! -L /usr/local/trip-server ]; then
	cd /usr/local
	ln -s /vagrant trip-server
fi
if [ ! -e /etc/systemd/system/trip.server ]; then
	systemctl is-active trip.service >/dev/null
	if [ $? -ne 0 ]; then
		cp /vagrant/provisioning/systemd/trip.s* /etc/systemd/system/
		systemctl enable trip.socket 2>/dev/null
		systemctl start trip.socket 2>/dev/null
	fi
fi

if [ ! -z "$ADMIN_PWD" ]; then
	>&2 echo
	>&2 echo "******************************************************************************"
	>&2 echo "I have created an initial admin user for TRIP"
	>&2 echo "login as 'admin@secret.org' with password '$ADMIN_PWD_TEXT'"
	>&2 echo "******************************************************************************"
fi

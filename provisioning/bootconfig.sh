#!/usr/bin/env bash

# Uncomment following line to import test data.  If VM already exists, perform
# 'vagrant ssh' into VM and drop the database with 'dropdb trip'.  It'll be
# recreated when your run 'vagrant reload' from the VM's host.
#IMPORT_TEST_DATA=y

# Uncomment the following to debug the script
#set -x

TRIP_WEB_CLIENT_VERSION='v1.1.5'
TRIP_WEB_CLIENT_RELEASE="trip-web-client-release-${TRIP_WEB_CLIENT_VERSION}.tar.gz"
TRIP_WEB_CLIENT_SHA256="c595703e94235bdab33a30d02dfb0d76b577f33422527af9aaf21a95e67bb4ad  ${TRIP_WEB_CLIENT_RELEASE}"
PG_VERSION=11

su - postgres -c 'createuser -drs vagrant' 2>/dev/null
su - vagrant -c 'cd /vagrant && yarn install'
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

	sed "s/\"signingKey\".*/\"signingKey\": \"${SIGNING_KEY}\",/; s/\"maxAge\": *[0-9]\+/\"maxAge\": 999/; s/\"host\": *\".*\", */\"host\": \"localhost\",/; s/\"path\": *\".*\", *$/\"path\": \"\/DO_NOT_FETCH_TILES_IN_DEMO_UNTIL_PROPERLY_CONFIGURED\/{z}\/{x}\/{y}.png\",/; s/\"uri\": *\".*\"/\"uri\": \"postgresql:\/\/trip:${SECRET}@localhost\/trip\"/; s/\"allow\":.*/\"allow\": false/; s/\"level\": *\"info\"/\"level\": \"debug\"/" /vagrant/config-dist.json >/vagrant/config.json

fi

if [ -d "/etc/postgresql/${PG_VERSION}" ]; then
	egrep 'local\s+trip\s+trip\s+md5' "/etc/postgresql/${PG_VERSION}/main/pg_hba.conf" >/dev/null 2>&1
	if [ $? -ne 0 ]; then
		sed -i 's/local\(.*all.*all.*$\)/local   trip            trip                                    md5\nlocal\1/' "/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
		systemctl reload postgresql
	fi
fi
cd /vagrant/spec/support
su - postgres -c 'createuser trip' 2>/dev/null
if [ $? -eq 0 ]; then
	su - postgres -c 'dropuser trip'
	echo "CREATE USER trip PASSWORD '$SECRET' NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT" | su - postgres -c psql
fi
su - postgres -c 'createdb trip' 2>/dev/null
if [ $? -eq 0 ]; then
	su - postgres -c 'psql trip' >/dev/null 2>&1 <<EOF
CREATE ROLE trip_role;
GRANT trip_role TO trip;
EOF
	su - postgres -c 'psql trip' <20_schema.sql >/dev/null
	su - postgres -c  'psql trip' <30_permissions.sql >/dev/null
	CREATED_DB='y'
fi
if [ "$CREATED_DB" == "y" ]; then
	# Create Test Data
	if [ "$IMPORT_TEST_DATA" == "y" ]; then
		su - postgres -c  'psql trip' <90_test-data.sql >/dev/null
	else
		ADMIN_PWD_TEXT=$(apg  -m 12 -x 14 -M NC -t -n 20 | tail -n 1)
		ADMIN_PWD=$(echo $ADMIN_PWD_TEXT | cut -d ' ' -f 1 -)
		su - postgres -c  'psql trip' <60_waypoint_symbols.sql >/dev/null
		su - postgres -c  'psql trip' <50_georef_formats.sql >/dev/null
		su - postgres -c  'psql trip' <40_path_colors.sql >/dev/null
		su - postgres -c 'psql trip' >/dev/null <<EOF
CREATE EXTENSION pgcrypto;
INSERT INTO role (name) VALUES ('Admin'), ('User');
WITH upd AS (INSERT INTO usertable (firstname, lastname, email, uuid, password, nickname) VALUES ('admin', 'admin', 'admin@trip.test', '224ea8e1-d534-4ba7-bc55-b0a63fe56e52', crypt('$ADMIN_PWD', gen_salt('bf')), 'admin') RETURNING id) INSERT INTO user_role (user_id, role_id) SELECT upd.id, r.id AS role_id FROM upd, role as r WHERE name='Admin';
EOF
	fi
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
	ln -s /vagrant/provisioning/nginx/index.html /var/www/trip/index.html
fi
if [ ! -e /var/www/trip/app/node_modules ]; then
	if [ -f /vagrant-trip-web-client/package.json ]; then
		echo "Configuring web client to use shared folder under /vagrant-trip-web-client/"
		cd /var/www/trip
		if [ ! -L app ]; then
			ln -s /vagrant-trip-web-client/app /var/www/trip/app
		fi
		if [ ! -d /vagrant-trip-web-client/node_modules ]; then
			su - vagrant -c 'cd /vagrant-trip-web-client && yarn install'
		fi
	elif [ -f /vagrant/trip-web-client/package.json ]; then
		echo "Configuring to run with web application under /vagrant/trip-web-client/"
		cd /var/www/trip
		if [ ! -L app ]; then
			ln -s /vagrant/trip-web-client/app /var/www/trip/app
		fi
		if [ ! -d /vagrant/trip-web-client/node_modules ]; then
			su - vagrant -c 'cd /vagrant/trip-web-client && yarn install'
		fi
	else
		echo "Configuring to run with a downloaded version of the web application"
		# If not, download and extract release
		if [ ! -e /vagrant/provisioning/downloads/${TRIP_WEB_CLIENT_RELEASE} ]; then
			cd /vagrant/provisioning/downloads
			wget --no-verbose https://www.fdsd.co.uk/trip-server/download/${TRIP_WEB_CLIENT_RELEASE} 2>&1
			echo "$TRIP_WEB_CLIENT_SHA256" | shasum -c -
			if [ $? -ne "0" ]; then
				>&2 echo "Checksum of downloaded file does not match expected value of ${TRIP_WEB_CLIENT_VERSION_SHA256}"
				exit 1
			fi
		fi
		cd /var/www/trip
		tar --no-same-owner --no-same-permissions -xf /vagrant/provisioning/downloads/${TRIP_WEB_CLIENT_RELEASE}
	fi
fi
if [ ! -L /usr/local/trip-server ]; then
	cd /usr/local
	ln -s /vagrant trip-server
fi
if [ ! -e /etc/systemd/system/trip.socket ]; then
	systemctl is-active trip.socket >/dev/null
	if [ $? -ne 0 ]; then
		cp /vagrant/provisioning/systemd/trip.s* /etc/systemd/system/
		systemctl enable trip.socket 2>/dev/null
		systemctl start trip.socket 2>/dev/null
	fi
fi

if [ ! -z "$ADMIN_PWD" ]; then
	ADMIN_PWD_PHONETIC=$(echo $ADMIN_PWD_TEXT | cut -d ' ' -f 2)
	>&2 echo
	>&2 echo "******************************************************************************"
	>&2 echo "I have created an initial admin user for TRIP"
	>&2 echo "login as 'admin@trip.test' with password '$ADMIN_PWD' $ADMIN_PWD_PHONETIC"
	>&2 echo "******************************************************************************"
fi

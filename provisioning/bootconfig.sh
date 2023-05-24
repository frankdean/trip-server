#!/usr/bin/env bash

# Uncomment the following to debug the script
#set -x

TRIP_WEB_CLIENT_VERSION='v1.11.7'
TRIP_WEB_CLIENT_RELEASE="trip-web-client-release-${TRIP_WEB_CLIENT_VERSION}.tgz"
TRIP_WEB_CLIENT_SHA256=d9af5ff1c93547ff8f570f0264578e466fb996de4861f6364b032330d4f25adc
PG_VERSION=13

su - postgres -c 'createuser -drs vagrant' 2>/dev/null
su - vagrant -c 'cd /vagrant && yarn install'
cd /vagrant
if [ -e config.yaml ]; then
	SECRET=$(grep 'uri:' /vagrant/config.yaml | cut -d ':' -f 4 | cut -d '@' -f 1)
else
	SECRET=$(apg  -m 12 -x 14 -M NC -t -n 20 | tail -n 1 | cut -d ' ' -f 1 -)
	SIGNING_KEY=$(apg  -m 12 -x 14 -M NC -t -n 20 | tail -n 1 | cut -d ' ' -f 1 -)
	UMASK=$(umask -p)
	umask o-rwx
	cp config-dist.yaml config.yaml
	$UMASK

	sed "s/level: 0/level: 4/; s/signingKey.*/signingKey: ${SIGNING_KEY},/; s/maxAge: *[0-9]\+/maxAge: 999/; s/host: *.*, */host: localhost,/; s/path: .*$/path: \/DO_NOT_FETCH_TILES_IN_DEMO_UNTIL_PROPERLY_CONFIGURED\/{z}\/{x}\/{y}.png,/; s/uri: .*/uri: postgresql:\/\/trip:${SECRET}@localhost\/trip/; s/allow: +.*/allow: false/; s/level: +info/level: debug/" /vagrant/config-dist.yaml >/vagrant/config.yaml

fi

if [ -d "/etc/postgresql/${PG_VERSION}" ]; then
	egrep 'local\s+trip\s+trip\s+md5' "/etc/postgresql/${PG_VERSION}/main/pg_hba.conf" >/dev/null 2>&1
	if [ $? -ne 0 ]; then
		sed -i 's/local\(.*all.*all.*$\)/local   trip            trip                                    md5\nlocal\1/' "/etc/postgresql/${PG_VERSION}/main/pg_hba.conf"
		systemctl reload postgresql
	fi
fi
if [ "$WIPE_DB" == "y" ]; then
	su - postgres -c 'dropdb trip'
	su - postgres -c 'dropuser trip'
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
fi
if [ ! -d /var/www/trip ]; then
	mkdir /var/www/trip
fi
chown vagrant.vagrant /var/www/trip
if [ ! -e /var/www/trip/index.html ]; then
	cd /var/www/trip
	ln -s /vagrant/provisioning/nginx/index.html /var/www/trip/index.html
fi
systemctl restart nginx

# Remove any existing link and then re-create
if [ -L /vagrant/app ]; then
	rm /vagrant/app
fi
if [ -f /vagrant-trip-web-client/package.json ]; then
	echo "Configuring web client to use shared folder under /vagrant-trip-web-client/"
	if [ -e /var/www/trip/app ]; then
		rm -rf /var/www/trip/app
	fi
	cd /var/www/trip
	if [ ! -L app ]; then
		ln -f -s /vagrant-trip-web-client/app /var/www/trip/app
	fi
	if [ ! -d /vagrant-trip-web-client/node_modules ]; then
		su - vagrant -c 'cd /vagrant-trip-web-client && yarn install'
	fi
	if [ "$TRIP_DEV" == "y" ]; then
		if [ -L /vagrant/app ]; then
			rm /vagrant/app
		fi
		ln -f -s /vagrant-trip-web-client/app /vagrant/app
	fi
elif [ -f /vagrant/trip-web-client/package.json ]; then
	echo "Configuring to run with web application under /vagrant/trip-web-client/"
	if [ -e /var/www/trip/app ]; then
		rm -rf /var/www/trip/app
	fi
	cd /var/www/trip
	if [ ! -L app ]; then
		ln -s /vagrant/trip-web-client/app /var/www/trip/app
	fi
	if [ ! -d /vagrant/trip-web-client/node_modules ]; then
		su - vagrant -c 'cd /vagrant/trip-web-client && yarn install'
	fi
	if [ "$TRIP_DEV" == "y" ]; then
		if [ -L /vagrant/app ]; then
			rm /vagrant/app
		fi
		ln -s /vagrant/trip-web-client/app /vagrant/app
	fi
else
	echo "Configuring to run with a downloaded version of the web application"
	# If not, download and extract release
	cd /vagrant/provisioning/downloads
	if [ ! -e /vagrant/provisioning/downloads/${TRIP_WEB_CLIENT_RELEASE} ]; then
		wget --no-verbose https://www.fdsd.co.uk/trip-server/download/${TRIP_WEB_CLIENT_RELEASE} 2>&1
	fi
	echo "$TRIP_WEB_CLIENT_SHA256  ${TRIP_WEB_CLIENT_RELEASE}" | shasum -c -
	if [ $? -ne "0" ]; then
		>&2 echo "Checksum of downloaded file does not match expected value of ${TRIP_WEB_CLIENT_VERSION_SHA256}"
		exit 1
	fi
	if [ -e /var/www/trip/app ]; then
		rm -rf /var/www/trip/app
	fi
	cd /var/www/trip
	tar --no-same-owner --no-same-permissions -xf /vagrant/provisioning/downloads/${TRIP_WEB_CLIENT_RELEASE}
	chown -R vagrant:vagrant .
	chmod -R o+r .
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

if [ "$TRIP_DEV" == "y" ]; then
	egrep '^export\s+CHROME_BIN' /home/vagrant/.profile >/dev/null 2>&1
	if [ $? -ne 0 ]; then
		echo "export CHROME_BIN=/usr/bin/chromium" >>/home/vagrant/.profile
	fi
fi
egrep '^export\s+EDITOR' /home/vagrant/.profile >/dev/null 2>&1
if [ $? -ne 0 ]; then
	echo "export EDITOR=/usr/bin/vi" >>/home/vagrant/.profile
fi

if [ ! -z "$ADMIN_PWD" ]; then
	ADMIN_PWD_PHONETIC=$(echo $ADMIN_PWD_TEXT | cut -d ' ' -f 2)
	>&2 echo
	>&2 echo "******************************************************************************"
	>&2 echo "I have created an initial admin user for TRIP"
	>&2 echo "login as 'admin@trip.test' with password '$ADMIN_PWD' $ADMIN_PWD_PHONETIC"
	>&2 echo "******************************************************************************"
fi

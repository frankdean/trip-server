<!-- -*- mode: markdown; -*- -->

# TRIP - Trip Recording and Itinerary Planner

## Introduction

TRIP is a JavaScript web-based application supporting trip recording and
itinerary planning.  It is designed to be a lightweight server application
such that it can be run on relatively low power devices like the
[Raspberry Pi][raspberrypi].

The intended use is for a hiker, mountain-biker or other adventurer, to be
able to publish and share their planned itinerary, then subsequently log their
positions at intervals, allowing someone else to be able to monitor their
progress.

In the event of contact being lost, the plans and tracking information can be
passed to rescue services etc., to assist with locating the missing
adventurer.

The [web client][trip-web-client] is an [AngularJS][] single-page application
([SPA][]) which can be served as static files using a web server such as
[Apache][], or served by the TRIP server application itself.

The following features are provided:

* Remote tracking server—client applications such as [GPSLogger][] can be
  used to submit locations to the server.

* Sharing tracks with others.

* Viewing tracks on a map provided by a tile server, e.g. OpenStreetMap tiles.

* Creating and sharing itineraries using the Markdown markup language.

* Using the map, interactively creating routes and waypoints for an itinerary.

* Uploading and downloading routes, tracks and waypoints for an itinerary as a
  [GPX][] file.

* Viewing routes, tracks and waypoints of an itinerary on the map.


## Requirements

* [Node.js][] - v4.x.x LTS

* [PostgreSQL][] database server - (Known to run on version 9.4)


## Quick Start Using [Vagrant][]

This option provides a working example of the application running in a
[VirtualBox][] virtual machine (VM) for those
[operating systems supported][vagrant-download] by [Vagrant][].  This also
provides a complete example of running the application behind the [Nginx][]
[engine x] HTTP reverse proxy server.  It is suitable for development or
demonstration not not as a production system.

**Note:** Installing all the required software, including the Vagrant box
involves downloading approximately 600MB of data.  Perhaps more of an
"easy-start" rather than a "quick-start".

[vagrant-download]: https://www.vagrantup.com/downloads.html "Vagrant Downloads"

1.  Download and install [VirtualBox][]

1.  Download and install [Vagrant][]

1.  Clone this repository to a suitable location on the machine you are going
    to use to host the application and VM:

		$ cd ~/projects
		$ git clone https://github.com/frankdean/trip-server.git

1.  Clone the TRIP web client application to have the same parent folder as
    the TRIP server

		$ cd ~/projects
		$ git clone https://github.com/frankdean/trip-web-client.git

1.  Start the Vagrant VM

		$ cd ~/projects/trip-server
		$ vagrant up

	The first time this is run, it will download a
    [Vagrant box](https://www.vagrantup.com/docs/boxes.html) containing a
    [Debian][] Linux distribution, then install the required Debian packages,
    modify the default configuration and start the TRIP server running behind
    an [Nginx][] web-server

1.  Make a note of the trip-server admin user credentials displayed at the end
    of the startup process
	
1.  Use your browser to navigate to <http://localhost:8080/> on the same
    machine and login providing the above credentials

1.  When finished, halt the server with:

		$ vagrant halt

[Vagrant][] shares the two source folders with the VM so that you can modify
the source files on the host server and immediately impact the deployed
application.  This gives you a complete working development environment.

**Note:** When the VM is initially provisioned, if the `node_modules`
sub-folder exists, it is removed and the contents re-installed/rebuilt to
ensure that all of the `npm` installed binaries are compatible with the VM's
operating system.  Similarly, you may need to remove and re-create this folder
if you choose to run the trip server directly on the local guest machine.

Rendering of map tiles is disabled by default, in order to respect
[OpenStreetMap's][OpenStreetMap] [Tile Usage Policy][].  You will need to
follow the instructions below, in the *Tile Server Configuration* section,
before map tiles are rendered.

If you forget the admin user (`admin@secret.org`) password, login into the VM
and modify the database entry in the [PostgreSQL][] database.  Replace
`SECRET` with your desired password.

	$ cd ~/projects/trip-server
	$ vagrant ssh
	$ psql trip
	trip=# UPDATE usertable SET password=crypt('SECRET', gen_salt('bf')) WHERE nickname='admin';
	trip=# \q

You can configure the time zone and locale settings by running the following
commands on the guest VM and following the prompts:

	$ sudo dpkg-reconfigure tzdata
	$ sudo dpkg-reconfigure locales

View the `Vagrantfile` configuration file in the root of the `trip-server`
folder for some examples you can modify.  E.g. you can enable the
`config.vm.network "public_network"` option to make the VM accessible from the
public network.  This would allow you, for example, to test location updates,
using a GPS enabled device sharing the same private LAN as the host VM.
[Note the warnings](https://www.vagrantup.com/docs/networking/public_network.html)
in the Vagrant documentation for this setting, as for convenience, **the VM is
insecure by default and design.**


## Standard Setup and Configuration

This section describes manually installing and configuring a server to run the
TRIP application.  It can be run as a standalone [Node.js][] server, or behind
a reverse proxy server, such as [Apache][] or [Nginx][].

These instructions assume installation on a [Debian][] based [Linux][] system,
but it should run on any system supported by [Node.js][].

The basic installation consists of downloading and configuring the
`trip-server` application, the `trip-web-client` application, and configuring
with the [PostgreSQL][] database server.

If the application is exposed to the Internet, ideally it should also be
configured to run behind an [Apache web server][Apache] using HTTPS.

1.  Install [Node.js][].  See
    [Installing Node on Linux](http://www.fdsd.co.uk/wiki/Tech/NodeJS.html).

1.  Download the `trip-server` application and install it in an appropriate
    folder, e.g. `/usr/local/trip-server`

1.  Install the packages required by `trip-server`:

		$ cd /usr/local/trip-server
		$ npm install

1.  Clone the [trip-web-client][] to an appropriate folder, ideally outside
    the server's folder, with a symlink from the `app` sub-directory of the
    server to the client's top-level folder.
    e.g. `/usr/local/trip-web-client`.

		$ cd /usr/local/trip-server
		$ ln -s ../trip-web-client/app

	On systems that do not support symlinks, it can be installed in the `app`
    sub-folder for running as a standalone development server.

	Alternatively, download a release build of the web client from the GitHub
    trip-web-client
    [releases page.](https://github.com/frankdean/trip-web-client/releases)
    and extract the contents to the `app` sub-folder of the trip-server
    application.

1.  Install the packages required by `trip-web-client`:

		$ cd /usr/local/trip-server/app
		$ npm install

1.  Create and modify `config.json` by initially making a copy of
    `config-dist.json`.  Make sure the file is not world-readable as it will
    contain the database and token signing passwords.  Review the file,
    modifying entries to suit your requirements.

	* `app.json.indent.level` - Indent level when debugging server with pretty
	  print enabled

	* `jwt.signingKey` - Create a strong password to sign authentication
      tokens with

	* `tile.cache.maxAge` - The number of days to cache tiles for.  They will
	  always be cached for at least the minimum set by the tile server's
	  expires header.  This setting allows that period to be increased.

	* `tile.providers` - These are arrays which configure the remote tile
	  server for maps.  (See Tile Server Configuration below).

	* `db.uri` - the URI for the trip user to connect to the trip database.
	  Replace the word 'secret' with the database password

	* `staticFiles.allow` - true to serve trip-web-client static files, false
	  if you are serving them from elsewhere, e.g. Apache

	* `debug` - true provide error message JSON objects in responses and log
	  all requests - should be false in a production environment

	* `log.level` - Sets the level of server logging - one of, debug, info,
	  warn or error

	* `reporting.metrics.tile.count.frequency` - How frequently to capture the
	  number of request that have been made to the remote tile server


### Tile Server Configuration

Most if not all tile server providers have policies that you must comply with
and there may be sanctions if you fail to do so.  E.g. If you are using the
[OpenStreetMap][] tile server, read and comply with their
[Tile Usage Policy][].
Please ensure you configure the following entries correctly for the
appropriate element of the `tile.providers` section(s) of `config.json`.

[Tile Usage Policy]: https://operations.osmfoundation.org/policies/tiles/ "OSM Tile Usage Policy"

- userAgentInfo - This is the e-mail address at which the system
  administrators can contact you

- refererInfo - A link to a public website with information about your
  application's deployment

**Note** these entries are sent in the HTTP header of each tile request and
will therefore end up in system logs etc.  Currently the tile requests are
sent over HTTP, therefore you should not mind this data being exposed.

The `tile.providers[x].mapLayer` entries provide the ability to display tile
map attributions most if not all tile providers require you to display.

The `mapLayer.name` attribute will be displayed when the map layers icon is
activated.  Only `xyz` map types are supported, so the `mapLayer.type`
attribute should always be `xyz`.

Map attributions are displayed on the map using the
`mapLayer.tileAttributions` section of the `tile.providers` attribute, which
allows attributions to be rendered with appropriate HTML links.  The
`tileAttributions` are an array of items that have either text, text and link
or just link attributes.  If the entry contains just text, the text will be
displayed in the map attribution.  If a link is included, the text will be
wrapped in HTML link tags and included in the map attribution.  The entries
are displayed in the sequence they have been defined.


### PostgreSQL Database Configuration

#### Configure md5 password access for trip user to trip database

Add the following entry to `/etc/postgresql/9.4/main/pg_hba.conf`, just
before the first entry for the `all` DATABASE and `all` USER type:

		local   trip     trip                             md5

Reload the database server configuration:

		$ sudo /etc/init.d/postgresql restart

or if using systemctl to manage daemons:

		$ sudo systemctl reload postgresql


#### Create the Database User

As a Unix user who is also a postgresql superuser:

		$ createuser -PDRS trip

This will command will prompt for a password for the user.  This needs to
match the password embedded in the `db.url` attribute in `config.json` when
the application is deployed.


#### Create the Database

As a Unix user who is also a postgresql superuser:

		$ createdb trip

Confirm the trip user can connect to the database using the password
created earlier:

		$ psql -d trip -U trip


#### Create tables and roles

As a Unix user who is also a postgresql superuser:

		$ cd ./spec/support
		$ psql trip <trip_role.sql
		$ psql trip <schema.sql
		$ psql trip <permissions.sql

Optionally, populate the database with data that can be used to perform
end-to-end tests.  Do not insert the test data into a production database as
it contains default application admin user credentials.

		$ psql trip <test-data.sql


#### Lookup Tables

The following tables are used to define lookup values for select boxes in the
web application:

- `waypoint_symbol` - Key-value pairs describing waypoint symbols. The `key`
  is written to waypoint entries when downloading GPX files.

- `track_color` - Key-value pairs together with an HTML color code.  The 'key'
  is written to track entries when downloading GPX files and the HTML color
  code is used to render the tracks on the itinerary map page.

- `georef_format` - Key-value pairs define how to format output of latitude
  and longitude values on the itinerary waypoint edit page.  Format parameters
  are defined using the `%` symbol and have the following meanings:

  * %d - degrees
  * %m - minutes
  * %s - seconds
  * %D - zero prefix single digit degree values
  * %M - zero prefix single digit minute values
  * %S - zero prefix single digit second values
  * %c - output the cardinal value, S, E, W or N
  * %i - output a minus sign for W and S
  * %p - output a minus sing for W and S and a plus sign for E and N

E.g. a format string of `%d°%M′%S″%c` would result in a lat/long value of
`1.5,-2.5` being displayed as `1°30′00″N 2°30′00″W`

Scripts to create default values for these lookup tables are in the
`./spec/support` folder, named `waypoint_symbols.sql`, `track_colors.sql` and
`georef_formats.sql` respectively.  The default waypoint symbols and track
colours are generally appropriate for Garmin devices.


#### Indexes for Query Performance

The `location` table has an index that is clustered on the `time` column to
improve the query performance of date range queries.  If the table becomes
large and performance degrades, run the psql `cluster` command from
time-to-time to re-cluster it.  Note an exclusive lock is placed on the table
for the duration of the cluster command execution.

See
<http://dba.stackexchange.com/questions/39589/optimizing-queries-on-a-range-of-timestamps-two-columns>
for more information.


### Creating an Initial Admin User

An initial admin user needs to be created in the database.  Thereafter, that
user maintains other users using web application.  Creating the initial admin
user fundamentally consists of making entries in the `usertable`, `role` and
`user_role` tables.

Firstly, create the entries in the `role` table by running the following
script using `psql`:

		INSERT INTO role (name) VALUES ('Admin'), ('User');

There is a [Node.js][] helper script (`./spec/support/startup_helper.js`)
which will output the SQL commands to create an admin user.  You can either
output the result to a file and then run the file into `psql`, or pipe the
output directly to `psql`.  e.g.

		$ cd ./spec/support
		$ node startup_helper.js | psql trip


## Standalone Node.js Server

The server can be run as a standalone server for development etc.

Run a terminal window and change to the directory where `trip-server` is
installed.

		$ cd /usr/local/trip-server

The `app` sub-folder of this directory must contain the `trip-web-client`
application, or be a symlink pointing to it.  The `trip-server` application
serves the `trip-web-client` files and other resources to the browser.

Start the server:

		$ node index.js

Using a browser, navigate to <http://localhost:8080/app/index.html>.  The
application should load in the browser and prompt for login.

The server can be stoped using `ctrl-c` in the terminal window.


## Apache

Optionally, the application can be run behind an [Apache][] server, proxying
requests to the application.

This has the benefit of allowing the application to co-exist with other
applications on the same server instance all running on the standard port 80.
Security of the server can also be enhanced by installing and configuring the
[mod-security](https://modsecurity.org/) Apache module.


### Reverse Proxy Configuration

Configure Apache2 to enable the `mod_proxy` and `proxy_wstunnels` modules.  On
[Debian][] this can be done with:

		$ sudo a2enmod proxy
		$ sudo a2enmod proxy_wstunnel
		$ sudo a2enmod rewrite

The application **must** be run over HTTPS to keep the login credentials
secure, otherwise others can see and re-use those credentials.

Modify the server configuration to implement the following rewrite rules.
Note that the default `socket.io` path is prefixed with `wstrack\` so that
multiple applications using websockets can be run on the same Apache server.
(TRIP uses websockets to provide updates to the tracking map.)  The TRIP web
client app will prefix the path when it is not calling a localhost URL.  These
rules need to be in a &lt;VirtualHost \_default\_:443\&gt; or
&lt;Directory\&gt; section of the mod_ssl configuration file.

		RewriteEngine on
		RewriteCond %{REQUEST_URI}  ^/wstrack/socket.io  [NC]
		RewriteCond %{QUERY_STRING} transport=websocket    [NC]
		RewriteRule /wstrack/(.*)           ws://localhost:8080/$1 [P,L]

Add the following to `trip.conf` outside the `<directory\>` directive:

		<IfModule mod_proxy.c>
		  ProxyPass /wstrack/socket.io/ http://localhost:8080/socket.io/
		  ProxyPassReverse /wstrack/socket.io/ http://localhost:8080/socket.io/

		  ProxyPass /trip/rest http://localhost:8080
		  ProxyPassReverse /trip/rest http://localhost:8080
		</IfModule>


### Redirecting to HTTPS

It is useful to ensure all users use HTTPS by providing a redirect rule to
redirect any HTTP requests to use HTTPS.  However, some logging clients do not
support HTTP, so it may be preferable to exclude the logging patterns from
redirection.  Generally, the logging URLs will be of the form
`http://${HOST}:${PORT}/trip/rest/log_point`.

This rule will redirect URLs excepting those like `/trip/rest/` which can then
be used by tracker clients that do not support HTTPS or redirections, to log
locations without being redirected.

This rule needs to be in the &lt;VirtualHost *:80\&gt; section of the HTTP server.

		RedirectMatch ^/trip/app/(.*)$ https://${MY_HOST}/trip/app/$1


### Configuring to redirect Traccar Client URLs

The [Traccar Client][] app currently does not provide a facility to define a
URL prefix.  All calls are to the server root.

A workaround is to configure the Apache server to redirect both HTTP and HTTPS
requests that match the pattern of [Traccar Client][] logging requests to the
`/trip/rest/log_point` URL prefix.

If you wish to support using the [Traccar Client][], enter the following in
the Apache &lt;VirtualHost\&gt; sections:

		# Redirect for Traccar Client
		<IfModule mod_rewrite.c>
			RewriteEngine On
			RewriteCond "%{QUERY_STRING}" "^id=[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}&timestamp=\d+&lat=[-.\d]+&lon=[-.\d]+"
			RewriteRule ^/ /trip/rest/log_point [PT,QSA]
		</IfModule>


## Miscellaneous

The following sections mostly relate to information around system maintenance
and application development.


### Useful queries for testing

Copy location records for user with id 1 to user with id 2

		INSERT INTO location (user_id, location, "time", hdop, altitude, speed, bearing)
		SELECT 2, location, "time", hdop, altitude, speed, bearing from location where user_id = 1;

Moved yesterday's test location data forward by 1 day:

		UPDATE location SET time = time + INTERVAL '1 day'
		WHERE user_id='1' AND time >= now()::timestamp::date - INTERVAL '1 day'
		AND	time <= now()::timestamp::date;


### Copying data

		create table temp_location (like location);

		insert into temp_location select * from location q where user_id=29 and time >= '2015-12-14' and time <= '2015-12-14T23:59:59'

		update temp_location set user_id=3, id=nextval('location_seq'::regclass);

		insert into location select * from temp_location;


### Backup

Backup just the schema, no data:

		$ pg_dump --schema-only --no-owner --no-privileges trip > schema.sql

Backup just the data, keeping the invariably large `tile` table separate:

		$ pg_dump --data-only --no-owner --no-privileges --exclude-table=tile trip > test-data.sql
		$ pg_dump --data-only --no-owner --no-privileges --table=tile trip > tiles.sql

Backup schema, data and privileges, including commands to recreate tables, excluding the tile data:

		$ pg_dump --clean --no-owner --exclude-table-data=tile trip > test-schema-data.sql

The above backup is suitable for every-day backup.  If you intend to restore
from the backup as part of your development and test cycle, remove the tile
table data exclusion so that the cache is not lost.


## Deploying a Release of trip-server

See the README of the trip-web-client application for instructions on creating
a release of the web client.

1.  Create backup of application's folder structure on target server

1.  Run `npm run lint`

1.  Update the version number in `config-dist.json`

1.  Check in the change and push the changes

1.  On the target server, pull the changes

1.  Update the version number in the local `config.json`

1.  Run `npm install` on the target server

1.  Run`npm outdated` and compare versions with test environment

1.  If necessary run `npm update`


## Next Release

This section describes any environmental changes, such as database changes or
configuration changes that need to be made since the last release, when
upgrading to the next release.

n/a


[trip-web-client]: https://github.com/frankdean/trip-web-client
[AngularJS]: https://angularjs.org
[Apache]: http://httpd.apache.org
[Debian]: https://www.debian.org "a free operating system (OS) for your computer"
[GPSLogger]: http://code.mendhak.com/gpslogger/ "A battery efficient GPS logging application"
[Linux]: https://www.kernel.org/
[Markdown]: http://daringfireball.net/projects/markdown/ "A text-to-HTML conversion tool for web writers"
[Nginx]: https://nginx.org/ "HTTP and reverse proxy server, a mail proxy server, and a generic TCP/UDP proxy server"
[Node.js]: https://nodejs.org/ "A JavaScript runtime built on Chrome's V8 JavaScript engine"
[OpenStreetMap]: http://www.openstreetmap.org/ "OpenStreetMap"
[PostgreSQL]: https://www.postgresql.org "A powerful, open source object-relational database system"
[RaspberryPi]: https://www.raspberrypi.org
[gpx]: https://en.wikipedia.org/wiki/GPS_Exchange_Format "GPS Exchange Format"
[semver]: http://semver.org
[spa]: https://en.wikipedia.org/wiki/Single-page_application "Single-page application"
[Traccar Client]: https://www.traccar.org/client/
[Vagrant]: https://www.vagrantup.com "Development Environments Made Easy"
[VirtualBox]: https://www.virtualbox.org "A x86 and AMD64/Intel64 virtualization product"

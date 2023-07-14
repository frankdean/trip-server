<!-- -*- mode: markdown; -*- vim: set tw=78 ts=4 sts=0 sw=4 noet ft=markdown norl: -->

# TRIP - Trip Recording and Itinerary Planner

## AngularJS Unsupported

This web application uses the [AngularJS][] framework, Google's support for
which, officially ended as of January 2022.  Consequently, this project is now
archived and is no longer supported.  It has been replaced with
[a C++ rewrite as Trip Server v2][trip-server-2], which supports all the use
cases of this version (Trip Server v1) and should suffer far less from the
impact of dependency changes.  See the
[README](https://www.fdsd.co.uk/trip-server-2/readme.html) for further
details.  It can be run alongside v1.

Migrating to v2 should be relatively easy in most environments.

There are now a number of vulnerabilities in the dependencies and
sub-dependencies of the unsupported AngularJS which I am not in a position to
fix.  Use `yarn audit` to list them and evaluate the vulnerabilities in terms
of how you build and deploy the application.

Converting the application to the newer Angular appears to be a substantial
piece of work.

I have spent a not inconsiderable amount of time and effort maintaining the
application, not least due to a frequent need to upgrade dependant packages,
due to security vulnerabilities, forced upgrades etc.

Considering these factors, coupled with the question of how long the newer
Angular may be supported for, I have rewritten the application, mostly in C++
running on Unix/Linux/macOS, with fundamentally the same PostgreSQL database,
with minimal dependencies.

Maintaining support for Trip v1 required a not inconsiderable amount of work,
mostly relating to upgrading dependencies, frequently due to security
vulnerabilities in underlying components.  Coupled with supply-chain attacks
within the [npm](https://www.npmjs.com) eco-system, I'm of the view that the
ongoing support impact of development in such an architecture is unacceptably
high.

As migrating to Angular 2+ is not trivial and with no reassurance that a
similar upgrade will not be necessary in the future, I was extremely
reluctant to simply follow the upgrade path.

Consequently, I wanted a solution that has as few dependencies as practical,
ideally with those minimal dependencies being on widely used libraries which
are unlikely to force much re-work of any application code.  I've used many
languages and experimented with some of the more popular modern languages, but
I don't see any meeting my desire for something that will remain largely
backward compatible, well supported for years to come and with low maintenance
overheads.

Reviewing the version history of a GUI application I previously wrote in C++,
I've only had one occasion where I *needed* to make a change in over a decade,
caused by the deprecation of [GConf](https://en.wikipedia.org/wiki/GConf)
(used for holding configuration settings).  It was a trivial change, and an
improvement to replace it with a [YAML](https://yaml.org) configuration file.

C++ scores highly on backwards compatibility, is governed by a good standards
committee process (ISO) and has steadily evolved into a powerful and widely
supported development language.  Using modern C++ practices *can* produce
stable, reliable, easy to maintain code.  With plenty of mature, stable
libraries for the more significant things we need; primarily support for
[PostgreSQL database][PostgreSQL], [PostGIS][], XML, JSON and YAML.  So far,
I am very satisfied with the results.

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

* Remote tracking server—client applications such as
  [TripLogger Remote for iOS][TripLogger] &ndash;
  ([on the App Store](https://apps.apple.com/us/app/triplogger-remote/id1322577876?mt=8))
  or
  [GPSLogger for Android][GPSLogger] can be used to submit locations to the
  server.

* Sharing tracks with others.

* Viewing tracks on a map provided by a tile server, e.g. OpenStreetMap tiles.

* Creating and sharing itineraries using the Markdown markup language.

* Using the map, interactively creating routes and waypoints for an itinerary.

* Uploading and downloading routes, tracks and waypoints for an itinerary as a
  [GPX][] file.

* Viewing routes, tracks and waypoints of an itinerary on the map.

* Splitting and joining routes and tracks.

* Deleting individual points from routes and tracks.

## Requirements

* [Node.js][] - v16.x.x

* [PostgreSQL][] database server - (Known to run on version 11.9)

* [PostGIS][] PostGIS spatial extension to PostgreSQL (2.5.x)

## Quick Start

You can quickly get the full application up and running either using
[Docker][] or [Vagrant][] virtualisation systems.  [Docker][] is probably the
simplest and easiest method to use.  Using both are described in following
sections.

## Quick Start Using [Play with Docker][play]

Use [Play with Docker][play] to run the application with some test data in a
browser, without having to install anything.

Navigate to [Play with Docker][play] and login using a Docker ID.  If you do
not have one, you will see the option to sign up after clicking `Login` then
`Docker`.

Click `+ ADD NEW INSTANCE`

Cut and paste each of the following commands in sequence into the terminal
window.  This will create a Docker network and run two containers, one
providing the database and the other the application web server.

	$ docker network create trip-server

	$ docker run --network trip-server --network-alias postgis \
	-e POSTGRES_PASSWORD=secret -d fdean/trip-database

	$ docker run --network trip-server -e TRIP_SIGNING_KEY=secret \
	-e TRIP_RESOURCE_SIGNING_KEY=secret -e POSTGRES_PASSWORD=secret \
	--publish 8080:8080 -d fdean/trip-server

Once the application is running a link titled `8080` will be shown
next to the `OPEN PORT` button at the top of the page.  Click on the
`8080` link to open a new browser window to the running web server.
If the port number doesn't show up, click on `OPEN PORT` and enter the
port number as `8080`.

Login using one of the following users and credentials:

	user@trip.test  rasHuthlutcew7
	admin@trip.test 7TwilfOrucFeug

See the [user documentation](https://www.fdsd.co.uk/trip-web-client-docs/) for
information on using the application.

[play]: https://labs.play-with-docker.com "Play with Docker"

## Quick Start Using [Docker][]

1.  Follow the
    [instructions for installing a Docker environment](https://www.docker.com/get-started).

2.  Clone this repository with [git][].

3.  Run the following command in the root of the cloned repository:

		$ sudo docker-compose up -d

4.  Navigate to <http://localhost:8080/app> with a web-browser.  The
    application runs with a small amount of test data.

5.  Login using one of the following users and credentials:

		user@trip.test  rasHuthlutcew7
		admin@trip.test 7TwilfOrucFeug

6.  Click `Help` in the Trip Web Client menu for the online user
    documentation.

The [Docker][] container can be stopped with:

	$ sudo docker-compose down

The script creates a Docker volume named 'trip-server_trip-db-data' for the
database store.  List the Docker volumes with:

	$ sudo docker volume ls

If you stop the container with the `--volumes` option, the database volume is
removed as well as the container:

	$ sudo docker-compose down --volumes

Alternatively, to remove the volume after the container has been stopped, it
can be removed with:

	$ sudo docker volume rm trip-server_trip-db-data

To use a Docker container for development, the environment requires
both the `trip-server` and `trip-web-client` projects to share the
same parent folder.  These folders are mounted within the Docker
container such that changes made on the host are also reflected within
the container.

Remove files and folders that will clash with the container:

	$ cd trip-web-client
	$ rm app/node-modules
	$ rm -rf node-modules
	$ cd ../trip-server
	$ rm -rf node-modules
	$ rm app
	$ mv config.json config.json~
	$ mv config.yaml config.yaml~

Rebuild and start the containers:

	$ sudo docker-compose --file docker-compose-dev.yml up --build -d
	$ sudo docker-compose logs --follow

To run an interactive Bash shell in a running container:

	$ sudo docker container ls
	$ sudo docker exec -it trip-server_web_1 bash -il

The server will automatically restart if any of it's `.js` or `.json` files
are altered.

When making changes to the `trip-web-client` HTML or JavaScript, you will need
to refresh the browser to replace the cached version.

Stop the Docker containers with:

	$ sudo docker-compose --file docker-compose-dev.yml down

Optionally, add the `--volumes` parameter to remove the Docker volumes
when shutting down.

Alternatively, the Docker volumes can be removed with:

	$ sudo docker volume rm trip-server_node_modules \
	trip-server_trip-web-client trip-server_web_node_modules \
	trip-server_trip-db-data

### Docker Swarm

The source code also contains a configuration file named
`docker-compose-swarm.yml` for running the application as a Docker swarm.
This uses Docker secrets instead of environment variables to pass secrets to
the container.  This can be used as the basis for a production configuration,
but it does not work across multiple nodes as it is using Docker's local volume
storage provider.  A third-party swarm aware storage provider is required to
work across multiple nodes.

After initialising the swarm, the secrets can be created as follows:

	$ echo 'secret' | docker secret create postgres_password -
	$ echo 'secret' | docker secret create jwt_signing_key -
	$ echo 'secret' | docker secret create jwt_resource_signing_key -

Note that the `postgres_password` is used to form a URI so must not contain a
forward-slash character.

See [DockerTips](https://www.fdsd.co.uk/wiki/Tech/DockerTips.html) which
contains some notes on running a Docker swarm.

### Using Docker for Development

It is possible to develop the application using a Docker container, by
working in the directory containing the current `trip-server` source
code and with the `trip-web-client` source code in a directory of that
name, sharing the same parent directory.  These folders will be bind
mounted to `/app-server` and `/webapp` in the running container.

To ensure there are no conflicts between the state of the source
folders and the container, it is best to have a clean source tree as
shown by `git clean -dxn`.  You may want to backup some files, such as
the configuration files, `config.json` or `config.yaml` before running
`git clean -dxf` to remove any files not under source control.

Use `docker-compose` to start up the containers:

	$ sudo docker-compose -f docker-compose-dev up --build -d

To stop the container:

	$ sudo docker-compose -f docker-compose-dev down

Add the `--volumes` parameter to the end of the command to also remove
the container's volumes which are used to keep the state of the
database and `node_modules` folders between sessions.

Modify `./test/karm.conf.js` to use the `ChromeNoSandbox` configuration.

Modify `./test/protractor.conf` to `chromeDockerConfig` configuration.

You may also need to alter `package.json` to call
`update-webdriver-90` if you get an error running `protractor` re an
incorrect driver version.  I.e.

    "preprotractor": "$npm_execpath run update-webdriver-90",

To start and connect to a Bash shell in the running container:

	$ docker exec -it -w /webapp -e LANG=en_GB.UTF-8 -e LC_ALL=en_GB.UTF-8 \
	trip-server_web_1 bash -il

Then, in the container, run the tests:

	$ cd /webapp
	$ yarn
	$ yarn run lint
	$ yarn run test-single-run
	$ yarn run protractor

Alternatively, run the test directly from the host:

	$ docker exec -it -w /webapp -e LANG=en_GB.UTF-8 -e LC_ALL=en_GB.UTF-8 \
	trip-web yarn run protractor

To connect to the datbase using `psql` within the container:

	$ docker exec -it trip-server_postgis_1 bash -il
	# su - postgres
	$ id
	$ psql -h postgis -d trip -U trip

When prompted, enter the password from the connect string shown in
`./trip-server/config.yaml` under the `db: uri:` entry.

## Quick Start Using [Vagrant][]

This option provides a working example of the application running in a
[VirtualBox][] virtual machine (VM) for those
[operating systems supported][vagrant-download] by [Vagrant][].  This also
provides a complete example of running the application behind the [Nginx][]
("engine x") HTTP reverse proxy server.  It is suitable for development or
demonstration, but not as a production system.

**Note:** Installing all the required software, including the Vagrant box
involves downloading approximately 600MB of data.  Perhaps more of an
"easy-start" rather than a "quick-start".

[vagrant-download]: https://www.vagrantup.com/downloads.html "Vagrant Downloads"

1.  Download and install [VirtualBox][]

1.  Download and install [Vagrant][]

1.  Clone this repository to a suitable location on the machine you are going
    to use to host the application and VM:

		$ cd ~/projects
		$ git clone git://www.fdsd.co.uk/trip-server.git

1.  Clone the TRIP web client application to have the same parent folder as
    the TRIP server

		$ cd ~/projects
		$ git clone git://www.fdsd.co.uk/trip-web-client.git

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

1.  Use your browser to navigate to <http://localhost:8080/> on the host
    machine and login providing the above credentials

1.  When finished, halt the server with:

		$ vagrant halt

[Vagrant][] shares the two source folders with the VM so that you can modify
the source files on the host server and immediately impact the deployed
application.  This gives you a complete working development environment.

**Note:** When the VM is initially provisioned, if the `node_modules`
sub-folder exists, it is removed and the contents re-installed/rebuilt to
ensure that all of the `yarn` installed binaries are compatible with the VM's
operating system.  Similarly, you may need to remove and re-create this folder
if you choose to run the trip server directly on the local guest machine.

Should you need it, e.g. for running a GUI in Vagrant, the `vagrant`
user's default password is `vagrant`.

Rendering of map tiles is disabled by default, in order to respect
[OpenStreetMap's][OpenStreetMap] [Tile Usage Policy][].  You will need to
follow the instructions below, in the *Tile Server Configuration* section,
before map tiles are rendered.

If you forget the admin user (`admin@trip.test`) password, login into the VM
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

Optionally, apply the latest Debian updates with:

	$ sudo apt-get upgrade

View the `Vagrantfile` configuration file in the root of the `trip-server`
folder for some examples you can modify.  E.g. you can enable the
`config.vm.network "public_network"` option to make the VM accessible from the
public network.  This would allow you, for example, to test location updates,
using a GPS enabled device sharing the same private LAN as the host VM.
[Note the warnings](https://www.vagrantup.com/docs/networking/public_network.html)
in the Vagrant documentation for this setting, as for convenience, **the VM is
insecure by default and design.**


### Trouble-shooting

#### Guest additions on this VM do not match the installed version of VirtualBox!

This means the installed box needs updating or an older version of VirtualBox
needs to be used.

A simple solution is to install
the [vagrant-vbguest](https://github.com/dotless-de/vagrant-vbguest)
package.

		$ vagrant plugin install vagrant-vbguest

However, if that fails:

1.  Check the vagrant-vbguest plugin status:

		$ vagrant vbguest --status

2.  If the guest version does not match the host, do:

		$ vagrant vbguest --do install

3.  This may fail.  Halt and restart Vagrant:

		$ vagrant halt

4.  Restart Vagrant and check the status again:

		$ vagrant up
		$ vagrant vbguest --status

The vbguest plugin host and guest versions should now match.

For further information, see the
[stackoverflow answer, "Existing VM"](https://stackoverflow.com/questions/20308794/how-to-upgrade-to-virtualbox-guest-additions-on-vm-box#35678489)

#### Vagrant has detected a configuration issue which exposes a vulnerability with the installed version of VirtualBox

e.g.

		Vagrant has detected a configuration issue which exposes a
		vulnerability with the installed version of VirtualBox. The
		current guest is configured to use an E1000 NIC type for a
		network adapter which is vulnerable in this version of VirtualBox.
		Ensure the guest is trusted to use this configuration or update
		the NIC type using one of the methods below:

		  https://www.vagrantup.com/docs/virtualbox/configuration.html#default-nic-type
		  https://www.vagrantup.com/docs/virtualbox/networking.html#virtualbox-nic-type

Should be fixed in VirtualBox 5.2.22, but error still reported by version
2.2.22 of Vagrant.  See <https://github.com/hashicorp/vagrant/issues/10481>


## Standard Setup and Configuration

This section describes manually installing and configuring a server to run the
TRIP application.  It can be run as a standalone [Node.js][] server, or behind
a reverse proxy server, such as [Apache][] or [Nginx][].

These instructions assume installation on a [Debian][] based [Linux][] system,
but it should run on any system supported by [Node.js][].

The basic installation consists of downloading and configuring the
`trip-server` application, the `trip-web-client` application, and configuring
with the [PostgreSQL][] database server.

On a Debian 10 (Buster) system, install the following packages:

		$ sudo apt-get install postgresql postgresql-contrib postgis

The following package will be installed automatically, unless you have set
`APT::Install-Recommends` to false in apt preferences.  If they aren't
automatically installed:

		$ sudo apt-get install postgresql-11-postgis-2.5 postgresql-11-postgis-2.5-scripts

If the application is exposed to the Internet, ideally it should also be
configured to run behind an [Apache web server][Apache] using HTTPS.

1.  Install [Node.js][].  See
    [Installing Node on Linux](http://www.fdsd.co.uk/wiki/Tech/NodeJS.html).

1.  Install [yarn][]

1.  Download the `trip-server` application and install it in an appropriate
    folder, e.g. `/usr/local/trip-server`

1.  Install the packages required by `trip-server`:

		$ cd /usr/local/trip-server
		$ yarn install

	If `bcrypt` fails to build, you probably need to install C++ build tools
	etc.  In Debian this is most easily achieved by installing the
	`build-essential` package.

1.  Clone the [trip-web-client][] to an appropriate folder, ideally outside
    the server's folder, with a symlink from the `app` sub-directory of the
    server to the client's top-level folder.
    e.g. `/usr/local/trip-web-client`.

		$ cd /usr/local/trip-server
		$ ln -s ../trip-web-client/app

	On systems that do not support symlinks, it can be installed in the `app`
    sub-folder for running as a standalone development server.

1.  Install the packages required by `trip-web-client`:

		$ cd /usr/local/trip-server/app
		$ yarn install

1.  TRIP server's configuration is maintained in a file named `config.json` or
    `config.yaml` in the application's root directory.  Create either the JSON
    or YAML format according to your personal preference.  If you don't have a
    preference, YAML is probably easier to use.  If both exist, `config.yaml`
    is chosen in preference by TRIP.

	Create the initial version by making a copy of `config-dist.json` or
    `config-dist.yaml` and modifying to suit your environment and preferences.

	Make sure the file is not world-readable as it will contain the database
    and token signing passwords.  Review the file, modifying entries to suit
    your requirements.

	* `app.json.indent.level` - Indent level when debugging server with pretty
	  print enabled

	* `app.origins` - Valid origins to handle
	  [Cross-Origin Resource Sharing (CORS)](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing).
	  Typically this is the protocol, host domain and port,
      e.g. `https://example.com:443`.  The default is `*:*` which
      currently allows all origins.

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
appropriate element of the `tile.providers` section(s) of `config.json` or `config.yaml`.

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


### Elevation Data

The [Consortium for Spatial Information (CGIAR CSI)][cgiar_csi] make
[Digital Elevation Model][DEM] data covering about 80% of the globe,
available for download.  It has been sourced and enhanced from data
gathered by the NASA Shuttle Radar Topographic Mission (SRTM).

From the main page of the [CGIAR CSI][cgiar_csi] website, follow the
link to `SRTM Data` to download `zip` files that contain `tiff` files
with 5m x 5m elevation data.

Extract the `tiff` files to a folder, e.g. `/var/local/elevation-data`
and configure an `elevation` section in `config.json` or `config.yaml`, e.g.

    ...

        "elevation" : {
            "tileCacheMs" : 60000,
            "datasetDir" : "/var/local/elevation-data/"
        },

    ...

When the Trip Server application is started, it reads all the `tiff`
files in the folder specified by the `elevation.datasetDir`
parameter and creates an in memory index containing the
area covered by each tile.  When elevation data is required for a
specific location, the relevant tile is loaded, the response provided,
and the tile retained in memory for the number of milliseconds
specified by the `elevation.tileCacheMs` parameter.

The `tiff` files take up a lot of space.  Where space is at a
premium, consider storing them in a compressed file system, e.g.
on Linux use [Squashfs][].

e.g.

1.  Download files to `~/downloads/srtm`

        $ mkdir -p ~/downloads/srtm
        $ cd ~/downloads/srtm
        $ wget http://srtm.csi.cgiar.org/wp-content/uploads/files/srtm_5x5/tiff/srtm_72_22.zip

1.  Extract the tiff files to `~/tmp/tiff`

        $ mkdir -p ~/tmp/tiff
        $ cd ~/tmp/tiff
        $ find ~/downlods/srtm -name '*.zip' -exec unzip -n '{}' '*.tif' \;

1.  Create a Squashfs compressed file containing the `tiff` images

        $ mksquashfs ~/tmp/tiff /var/local/elevation-data.squashfs -no-recovery

    The `-no-recovery` option is to stop Squashfs leaving a recovery
    file behind in the destination folder.  However, it does mean that should the
    operation fail, there is no recovery information to unwind the
    command.  This is probably more of a potential problem when
    appending to an existing Squashfs file.

1.  Optionally, delete or archive the downloaded `zip` files to free
    up space.

1.  Download more files, extract them and squash them using the above
    steps.  Repeating the `mksquashfs` command as above will append
    to an existing Squashfs file.

1.  You can list the contents of the Squashfs file with:

        $ unsquashfs -i -ll /var/local/elevation-data.squashfs

1.  Test mounting the Squashfs file

        $ mkdir -p /var/local/elevation-data/
        $ sudo mount -t squashfs /var/local/elevation-data.squashfs /var/local/elevation-data/
        $ ls /var/local/elevation-data/
        $ sudo umount /var/local/elevation-data

1.  Add an entry to `/etc/fstab` to mount the Squashfs file on boot:

        $ echo '/var/local/elevation-data.squashfs /var/local/elevation-data squashfs ro,defaults 0 0' \
          | sudo tee -a /etc/fstab

1.  Mount using the `/etc/fstab` entry:

        $ sudo mount /var/local/elevation-data
        $ ls /var/local/elevation-data
        $ sudo umount /var/local/elevation-data

1.  If need be in the future, you can extract the files from the Squashfs file with:

        $ unsquashfs -i /var/local/elevation-data.squashfs

    Which will extract all the files to a sub-folder of the current
    working folder named `squashfs-root`.

    Use the `-f` parameter if the `squashfs-root` folder already exists.

1.  To extract select files, create another file containing the names
    of the files to be extracted, prefixed by a forward-slash.  e.g.
    `/srtm_11_03.tiff`.

        $ unsquashfs -i -e list-of-files.txt /var/local/elevation-data.squashfs

See [SquashFS HOWTO](http://tldp.org/HOWTO/SquashFS-HOWTO/creatingandusing.html)
for more information


[DEM]: https://en.wikipedia.org/wiki/Digital_elevation_model "Digital Elevation Model"

[cgiar_csi]: http://srtm.csi.cgiar.org/ "Consortium for Spatial Information"

[squashfs]: http://squashfs.sourceforge.net "a compressed read-only filesystem for Linux"


### PostgreSQL Database Configuration

#### Configure md5 password access for trip user to trip database

Add the following entry to `/etc/postgresql/11/main/pg_hba.conf`, just
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
match the password embedded in the `db.url` attribute in `config.json` or `config.yaml` when
the application is deployed.


#### Create the Database

As a Unix user who is also a postgresql superuser:

		$ createdb --owner=trip trip

Confirm the trip user can connect to the database using the password
created earlier:

		$ psql -d trip -U trip


#### Create tables and roles

As a Unix user who is also a postgresql superuser:

		$ cd ./spec/support
		$ psql trip <10_trip_role.sql
		$ psql trip <20_schema.sql
		$ psql trip <30_permissions.sql

Optionally, populate the database with data that can be used to perform
end-to-end tests.  Do not insert the test data into a production database as
it contains default application admin user credentials.

		$ psql trip <90_test-data.sql


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
`./spec/support` folder, named `60_waypoint_symbols.sql`, `40_path_colors.sql` and
`50_georef_formats.sql` respectively.  The default waypoint symbols and track
colours are generally appropriate for Garmin devices.  If fact, the colours
are the only ones allowed by the
[Garmin Extensions XSD](http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd).


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


## Nginx Web Server

The application can be deployed with either the [Apache][] or [Nginx][] web
servers.  The section below this section describes setting up Apache.

Setting up [Nginx][] isn't documented here but can readily be determined by
looking at the Vagrant setup scripts under the `./provisioning/` folder in the
source distribution, or by deploying using Vagrant and examining the working
Vagrant installation.


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


### Tile usage monthly cumulative totals for the last year:

		SELECT year, month, max(count) AS cumulative_total FROM (
			SELECT time, extract(year from time) AS year,
			extract(month from time) AS month,
			extract(day from time) AS day,
			count FROM tile_metric ORDER BY time DESC) AS q
		GROUP BY q.year, q.month ORDER BY q.year desc, q.month DESC LIMIT 12;


### Deleting expired tiles from the cache

Count how many tiles are expired:

	SELECT count(*) FROM tile WHERE expires < now();

count how many are not expired:

	SELECT count(*) FROM tile WHERE expires >= now();

Count how many are expired and older than 90 days:

	SELECT count(*) FROM tile WHERE expires < now() AND updated < now()::timestamp::date - INTERVAL '90 days';

Delete tiles which are older than 90 days and have expired:

	DELETE FROM tile WHERE expires < now() AND updated < now()::timestamp::date - INTERVAL '90 days';

Delete all expired tiles:

	DELETE FROM tile WHERE expires < now();


### Freeing up system disk space after deleted tiles (or other records)

To see how much space is begin used by the whole database:

	SELECT pg_size_pretty(pg_database_size('trip'));

To see how much space is being used the the tiles table:

	SELECT pg_size_pretty(pg_table_size('tile'));

Normally, a PostgreSQL installation will be configured to run the
[VACUUM](https://www.postgresql.org/docs/9.4/static/sql-vacuum.html) command
automatically from time-to-time.  This allows deleted records to be re-used,
but does not generally free up the system disk space being used by the deleted
records.  To do that, the `VACUUM` command needs to be run with the `FULL`
option.

**Note** that `VACUUM FULL` requires an exclusive lock on the table it is
working on so cannot be run in parallel with other database operations using
the table.

See the
[Recovering Disk Space](https://www.postgresql.org/docs/9.4/static/routine-vacuuming.html#VACUUM-FOR-SPACE-RECOVERY)
section of the
[PostgreSQL documentation](https://www.postgresql.org/docs/9.4/static/index.html)
for more information.

To free up the system disk space used by the tiles table, in `plsql` run:

	VACUUM FULL tile;

or

	VACUUM (FULL, VERBOSE) tile;

To free up the system disk space used by all tables:

	VACUUM FULL;

or

	VACUUM (FULL, VERBOSE);


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

		$ pg_dump --clean --if-exists --no-owner --exclude-table-data=tile trip > test-schema-data.sql

The above backup is suitable for every-day backup.  If you intend to restore
from the backup as part of your development and test cycle, remove the tile
table data exclusion so that the cache is not lost.


## Deploying a Release of trip-server

See the README of the trip-web-client application for instructions on creating
a release of the web client.

1.  Create backup of application's folder structure on target server

1.  Run `yarn run lint`

1.  Update the version number in `package.json`

1.  Check in the change and push the changes

1.  On the target server, pull the changes

1.  Run `yarn install` on the target server

1.  Optionally, run `yarn outdated` and compare versions with test environment

1.  If necessary run `yarn upgrade`

## Known Issues

1.  [Node.js v18 not currently supported by node-gdal](https://github.com/naturalatlas/node-gdal/issues/298)

## Next Release

See [CHANGELOG](./CHANGELOG.md)

[trip-server-2]: https://www.fdsd.co.uk/trip-server-2/
[trip-web-client]: https://www.fdsd.co.uk/trip-web-client-docs/
[AngularJS]: https://angularjs.org
[Apache]: http://httpd.apache.org/ "an open-source HTTP server for modern operating systems including UNIX and Windows"
[Debian]: https://www.debian.org "a free operating system (OS) for your computer"
[docker]: https://www.docker.com "Securely build and share any application, anywhere"
[Git]: http://git-scm.com/ "a free and open source distributed version control system designed to handle everything from small to very large projects with speed and efficiency"
[GPSLogger]: http://code.mendhak.com/gpslogger/ "A battery efficient GPS logging application"
[Linux]: https://www.kernel.org/
[Markdown]: http://daringfireball.net/projects/markdown/ "A text-to-HTML conversion tool for web writers"
[Nginx]: https://nginx.org/ "HTTP and reverse proxy server, a mail proxy server, and a generic TCP/UDP proxy server"
[Node.js]: https://nodejs.org/ "A JavaScript runtime built on Chrome's V8 JavaScript engine"
[OpenStreetMap]: http://www.openstreetmap.org/ "OpenStreetMap"
[PostgreSQL]: https://www.postgresql.org "A powerful, open source object-relational database system"
[PostGIS]: https://postgis.net "Spatial and Geographic objects for PostgreSQL"
[RaspberryPi]: https://www.raspberrypi.org
[gpx]: http://www.topografix.com/gpx.asp "The GPX Exchange Format"
[semver]: http://semver.org
[spa]: https://en.wikipedia.org/wiki/Single-page_application "Single-page application"
[Traccar Client]: https://www.traccar.org/client/
[TripLogger]: https://www.fdsd.co.uk/triplogger/ "TripLogger Remote for iOS"
[Vagrant]: https://www.vagrantup.com "Development Environments Made Easy"
[VirtualBox]: https://www.virtualbox.org "A x86 and AMD64/Intel64 virtualization product"
[yarn]: https://yarnpkg.com/ "Fast, reliable and secure dependency management"

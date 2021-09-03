# Trip - Release Procedure

## Changelog

1.  Update `./trip-server/CHANGELOG.md` with the changes in this
    release.

1.  Run `audit` command for both applications:

		$ yarn audit

1.  Check for outdated packages:

		$ yarn outdated

## Vagrant

Update Vagrant first, if Vagrant is to build the `trip-web-client`
distribution.

1.  It may be necessary to update VirtualBox to the latest version to
    avoid conflicts between the guest versions downloaded by Vagrant
    and the guest version on the host machine.

1.  Check the Debian Vagrant box is the latest:

		$ vagrant box update

1.  If the box has been updated, install the `vagrant-vbguest` plugin:

		$ vagrant plugin install vagrant-vbguest

1.  Edit the `myEnv` settings in `./Vagrantfile` to use Vagrant for
    Development.

		  myEnv = { :IMPORT_TEST_DATA => "y",
					:TRIP_DEV => "y",
					:VB_GUI => "n",
					:WIPE_DB => "n" }

1.  Update `./provisioning/bootstrap.sh` to download the latest
    version of [Node.js](https://nodejs.org/dist/latest-v12.x/) and
    update the SHA256 checksum.

1.  Create a new Vagrant VM

		$ cd ./trip-server
		$ mv config.json config-old.json
		$ mv config.yaml config-old.yaml
		$ rm -rf node_modules
		$ rm app
		$ vagrant destroy
		$ vagrant up

1.  Stop `trip-server` System D services:

		$ vagrant ssh
		vagrant@debian-10:~$ sudo systemctl stop trip.socket
		vagrant@debian-10:~$ sudo systemctl stop trip.service

1.  Run tests for `trip-server`:

		vagrant@debian-10:~$ cd /vagrant
		vagrant@debian-10:~$ yarn lint
		vagrant@debian-10:~$ yarn test-single-run

	As a tile provider is not configured and no tiles will have been
    cached yet, one related test is expected to fail when run in this
    environment.  The failure can be ignored.

1.  Run the server again:

		vagrant@debian-10:/vagrant$ sudo systemctl start trip.socket

1.  Build and test the `trip-web-client` release:

		vagrant@debian-10:~$ cd /vagrant-trip-web-client
		vagrant@debian-10:~$ yarn lint
		vagrant@debian-10:~$ yarn test-single-run
		vagrant@debian-10:~$ yarn build-release

		vagrant@debian-10:~$ cd /vagrant
		vagrant@debian-10:~$ rm app
		vagrant@debian-10:~$ tar -xf /vagrant-trip-web-client/dist/trip-web-client-release-$VERSION.tgz

		vagrant@debian-10:~$ cd /vagrant-trip-web-client
		vagrant@debian-10:~$ yarn protractor

	The `protractor` tests may fail with an error due to the browser
    and web driver versions conflicting.  The error message will
    specify the current browser version.  Modify the
    `./trip-web-client/package.json` script for `update-webdriver` to
    specify the corrent version number.  E.g.:

		"webdriver-manager update --versions.chrome=90.0.4430.212"

	**Note:** Protractor is run within the VM, so it will use port
    8080 which `trip-server` is listening on and will statically serve
    the files from the `/vagrant/app` directory.  If Protractor is run
    on the host, port 8080 is forwarded to port 80 on the guest and it
    will run the tests against the `trip-web-client` deployed under
    `/var/www/trip` and served by nginx, which may well differ from
    the intended version.

	Thereafter, all the `trip-web-client` Protractor tests should
    pass.

1.  Copy the `trip-web-client` release to the release server.

1.  Update `./trip-server/provisioning/bootconfig.sh` to download the release
    version of `trip-web-client` and update the SHA256 checksum.

1.  Shutdown Vagrant:

		$ vagrant halt

1.  Edit the `myEnv` settings in `./Vagrantfile` to use Vagrant with
    the new release.

		  myEnv = { :IMPORT_TEST_DATA => "y",
					:TRIP_DEV => "n",
					:VB_GUI => "n",
					:WIPE_DB => "n" }

1.  Start Vagrant:

		$ vagrant up

1.  Use a browser to navigate to <http://localhost:8080> on the host
    machine and check the version reported in the status bar.  This
    will now be using the downloaded distribution version of
    `trip-web-client` served by the `nginx` server.

1.  Build the `trip-server` release:

		$ vagrant ssh
		vagrant@debian-10:~$ cd /vagrant
		vagrant@debian-10:~$ yarn build-release

1.  Copy the `trip-server` release to the release server.

## Docker

1.  Optionally, build the database image.  This only needs updating if
    there have been any database schema changes.

	Update `Dockerfile-postgis` to use the latest
	[PostgreSQL build](https://hub.docker.com/_/postgres).

		$ docker build -t fdean/trip-database:latest .

1.  Build the `trip-server` image:

	Update `Dockerfile` to use the latest appropriate
    [node](https://hub.docker.com/_/node) build.

	Also update `Dockerfile` with the latest `trip-web-client`
    version details.

		$ docker build -t fdean/trip-server:latest .

1.  Optionally, run the Docker container for development:

	Prepare the development environmnet.  Remove any symlinks or
    folders named `app` from `./trip-server/`:

		$ cd ./trip-server
		$ mv config.json config-old.json
		$ mv config.yaml config-old.yaml
		$ rm -rf node_modules
		$ rm -rf app
		$ ln -s /trip-web-client/app

	Check the `trip-db-data` volume does not exist:

	$ docker volume ls

	If it does, remove it so that the container creates a new
    database, using the configured database password:

		$ sudo docker volume rm trip-server_trip-db-data

	Start the containers:

		$ docker-compose -f docker-compose-dev.yml up -d
		$ docker-compose logs --follow

	Optionally, run `bash` in the container as follows:

		$ docker container ls
		$ docker exec -it trip-server_web_1 bash -il

	If there are issues connecting to the database, check the
    connection as follows:

		$ docker exec -it trip-server_web_1 bash -il
		$ echo $POSTGRES_PASSWORD
		$ psql -U trip -d trip -h localhost -W

	When prompted, enter the password echoed in the previous command.

	Optionally, build the server release with:

		$ docker exec -it trip-server_web_1 bash -il
		$ yarn build-release

	Optionally, build `trip-web-client` with:

		$ cd /trip-web-client
		$ yarn build-release

	It's not possible to run the tests within the container as it
    would also need `openjdk-11-jdk`, `chromium' and 'chromium-l10n`
    packages installed.  It would also need the `CHROME_BIN`
    environment variable set to `/usr/bin/chromium`.  With all the
    dependencies that are installed, we end up with a very large
    image.

	Stop the container with (use the `--volumes` switch to also remove
    the database volume):

		$ docker-compose -f docker-compose-dev.yml down --volumes

## Draft Releases

1.  Create a draft of the release notes for `trip-web-client` and
    `trip-server` on GitHub, copying the build artifacts to the list
    of release assets.

## Final Release

1.  Push Docker images:

		$ docker tag fdean/trip-server:latest fdean/trip-server:$VERSION
		$ docker push fdean/trip-server:latest
		$ docker push fdean/trip-server:$VERSION

1.  Optionally, push database image:

		$ docker tag fdean/trip-database:latest fdean/trip-database:$VERSION
		$ docker push fdean/trip-database:latest
		$ docker push fdean/trip-database:$VERSION

FROM ubuntu:12.04

# Installation:
# Import MongoDB public GPG key AND create a MongoDB list file
RUN apt-key adv --keyserver keyserver.ubuntu.com --recv 7F0CEB10
RUN echo "deb http://downloads-distro.mongodb.org/repo/ubuntu-upstart dist 10gen" | tee -a /etc/apt/sources.list.d/10gen.list

# Update apt-get sources AND install MongoDB
RUN apt-get -y -qq update && \
	apt-get -y -qq install mongodb-10gen=2.4.0 && \
	mkdir -p /data/db

COPY ./dbSetUp.js /

RUN /usr/bin/mongod --quiet --fork --logpath /mongod-run.log && \
    mongo --quiet < dbSetUp.js

# Set usr/bin/mongod as the dockerized entry-point application
ENTRYPOINT ["/usr/bin/mongod"]

# Expose port 27017 from the container to the host
EXPOSE 27017

#!/bin/sh

# Read .env file
for i in $(egrep -v '^#|^$' .env); do
    export $i
done

# check ADMIN_ADRESS exists
if [ -z ${ADMIN_ADDRESS+x} ]; then
    echo "ADMIN_ADDRESS is not setted"
    exit 1
fi

# Compile all files again
echo "> ./node_modules/.bin/truffle compile --all"
./node_modules/.bin/truffle compile --all

status=$?
if [ $status -gt 0 ]; then
    exit 1
fi

# Push contracts
echo "> zos push --network deploy --from $ADMIN_ADDRESS"
zos push --network deploy --from $ADMIN_ADDRESS

status=$?
if [ $status -gt 0 ]; then
    exit 1
fi

# Update proxy
echo "> zos update Gateway --network deploy --from $ADMIN_ADDRESS"
zos update Gateway --network deploy --from $ADMIN_ADDRESS

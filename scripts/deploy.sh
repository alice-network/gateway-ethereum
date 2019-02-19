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

# check OWNER_ADDRESS exists
if [ -z ${OWNER_ADDRESS+x} ]; then
    echo "OWNER_ADDRESS is not setted";
    exit 1
fi

# check ORACLE_ADDRESS exists
if [ -z ${ORACLE_ADDRESS+x} ]; then
    echo "ORACLE_ADDRESS is not setted";
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

# Create proxy
echo "> zos create Gateway --init initialize --args $OWNER_ADDRESS,$ORACLE_ADDRESS --network deploy --from $ADMIN_ADDRESS"
zos create Gateway --init initialize --args $OWNER_ADDRESS,$ORACLE_ADDRESS --network deploy --from $ADMIN_ADDRESS

status=$?
if [ $status -gt 0 ]; then
    exit 1
fi

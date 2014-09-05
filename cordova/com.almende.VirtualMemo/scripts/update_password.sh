#!/bin/sh

# http://developer.sense-os.nl/APIReference/Users/#/users

cred_file=credentials.txt

# file should have as contents
# username = common-sense user name
# password = md5 hashed password for common-sense
if [ -e "$cred_file" ]; then
	echo "Source file $cred_file"
	source "./$cred_file"
fi

echo "Make sure the password is an md5hash!"

if [[ "$page" == "" ]]; then
	echo "There is no page id defined as argument, we will use page=1"
	page=1
fi


if [[ "$username" == "" ]]; then
	read -p "Fill in your username of your common-sense account: " u
	username="$u"
fi

if [[ "$password" == "" ]]; then
	read -p "Fill in your password of your common-sense account: " p
	password=$(echo -n "$p" | md5sum | awk '{print $1}')
fi

if [[ "$new_password" == "" ]]; then
	read -p "Fill in the new password for your common-sense account: " p
	new_password=$(echo -n "$p" | md5sum | awk '{print $1}')
fi

echo 
echo curl -s -H "Content-Type: application/json" -X GET https://api.sense-os.nl/users/current/account?username\=$username\&password\=$password
echo
answer=$(curl -s -H "Content-Type: application/json" -d "{\"page\"=\"0\"}" -X GET https://api.sense-os.nl/users/current?username\=$username\&password\=$password)

id=$(echo $answer | cut -f3 -d':' | cut -f1 -d',' | tr -d '"')

echo "Found id: $id"

echo "Send value $value to sensor $sensor in account $username"
echo " # note 1: you can use $cred_file to store username and md5 hash of your password)"
echo " # note 2: you can expect nothing back from sense to indicate success, navigate to their online database instead"
echo "Result: "
echo curl -s -H "Content-Type: application/json" -d "{\"new_password\"=\"$new_password\", \"current_password\"=\"$password\"}" -X POST https://api.sense-os.nl/change_password?username\=$username\&password\=$password
#curl -s -H "Content-Type: application/json" -d "{\"new_password\"=\"$new_password\", \"current_password\"=\"$password\"}" -X POST https://api.sense-os.nl/change_password?username\=$username\&password\=$password
echo curl -s -H "Content-Type: application/json" -d "{\"new_password\"=\"$new_password\", \"current_password\"=\"$password\"}" -X POST "https://api.sense-os.nl/change_password?username=$username&password=$password&current_password=$password&new_password=$new_password"
curl -s -H "Content-Type: application/json" -d "{\"new_password\"=\"$new_password\", \"current_password\"=\"$password\"}" -X POST "https://api.sense-os.nl/change_password?username=$username&password=$password&current_password=$password&new_password=$new_password"
echo
echo "Done"

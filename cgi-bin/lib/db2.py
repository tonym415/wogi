#!C:\Python34\python.exe -u
import mysql.connector
from mysql.connector import errorcode

import os
import sys
sys.path.append(os.path.realpath(os.path.dirname(__file__)))
import conn
import cgitb

cgitb.enable()

_connection = None
_connector = None

def get_connection():
    """ returns a connection to the database """
    global _connection
    global _connector

    _connector = mysql.connector
    try:
        if not _connection:
            _connection = _connector.connect(**conn.connStr())
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Something is wrong with your user name or password")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("Database does not exist")
        else:
            print(err)

    return _connection
# List of stuff accessible to importers of this module. Just in case
__all__ = ['get_connection']

if __name__ == "__main__":
    pass
    print("type: %s" % type(get_connection()))
    print("dir: %s" % dir(get_connection()))

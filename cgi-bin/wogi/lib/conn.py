#!C:\Python34\python.exe -u
import os
import inspect
def connStr():
    """ Returns the connection parameters for the database """
    return {
        'user': 'webuser',
        'password': 'webuser',
        'host': '127.0.0.1',
        'database': 'wogi'
    }

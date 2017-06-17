#!C:/Python27/python
import os
import sys
import inspect
import cgi
import cgitb
import json
import importlib
import traceback

if "REQUEST_METHOD" not in os.environ:
    sys.path.append(os.path.realpath(os.path.dirname(__file__)))
from wogi.Question import *

cgitb.enable()


def sendHeaders(ctype="text/html"):
    """ Sends headers """
    print("Content-Type: %s; charset=utf-8\n\n" % ctype)


def returnJson(data, toJSON=True):
    """ Takes data (string) send back return value (JSON by default)"""
    if not toJSON:
        sendHeaders()
    else:
        sendHeaders("application/json")

    print(json.dumps(data, default=str))


def showParams(fs):
    try:
        if 'request' in fs:
            # w2ui grid params
            r = json.loads(fs['request'])
            """ get class specific values """
            fs = r
            className = r['id']
            if 'search' in r:
                funcName = "search"
            elif 'sort' in r:
                funcName = "search"
            elif 'cmd' in r:
                funcName = r['cmd']
                if funcName == 'get':
                    funcName = r['function']
            else:
                funcName = r['function']

        elif 'id' in fs:
            # application functions
            """ get class specific values """
            className = fs['id']
            funcName = fs['function']
        else:
            # the rest...
            return returnJson("Unknown Module")

        """ import specific module and create an instance """
        module = importlib.import_module('wogi.' + className)
        myClass = getattr(module, className)
        instance = myClass(fs)

        """ get/call specific function based on class """
        funcRef = getattr(instance, funcName)
        returnJson(funcRef())
    except Exception as e:
        returnJson("{}".format(e))


def main():
    pass


def cgiFieldStorageToDict(fieldstorage):
    """ get plain dictionary from cgi.FieldStorage """
    params = {}
    # return returnJson(fieldstorage)
    for key in fieldstorage.keys():
        params[key] = fieldstorage.getvalue(key)

    return params


if "REQUEST_METHOD" in os.environ:
    FSTOR = cgiFieldStorageToDict(cgi.FieldStorage())
    showParams(FSTOR)
else:
    main()

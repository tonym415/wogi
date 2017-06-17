#!C:\Python27\python.exe
"""
The Entity base class is used to handle all functions related to the db manipulation
"""
import os
import sys
import traceback
import db2
import cgitb

cgitb.enable()

class Entity(object):
    """ initalize db Entity object """
    _cnx = None

    def __init__(self, *info, **kwargs):
        self.db2 = db2
        self._cnx = self.db2.get_connection()
        self.cursor = self._cnx.cursor(buffered=True, dictionary=True)
        for dictionary in info:
            for key in dictionary:
                setattr(self, key, dictionary[key])

    def executeModifyQuery(self, query, params):
        returnDict = {}
        try:
            self.cursor.execute(query, params)
            self._cnx.commit()
            returnDict['id'] = self.cursor.lastrowid
        except Exception as e:
            returnDict['error'] = "{}".format(e)
            returnDict['stm'] = self.cursor.statement

        return returnDict

    def executeQuery(self, query, params, returnEmpty=False):
        returnDict = {}
        try:
            self.cursor.execute(query, params)
            if self.cursor.rowcount > 0:
                returnDict = self.cursor.fetchall()
            elif returnEmpty:
                returnDict = {}
            else:
                raise Exception("%s yields %s" %
                                (self.cursor.statement.replace('\n', ' ')
                                 .replace('            ', ''), self.cursor.rowcount))
        except Exception as e:
            returnDict['error'] = "{}".format(e)
            returnDict['stm'] = self.cursor.statement

        return returnDict

    def getColNames(self, tableName):
        from mysql.connector import FieldFlag
        params = {}
        query = "SELECT * FROM %s" % tableName
        self.executeQuery(query, params)

        columns = []
        maxnamesize = 0
        for coldesc in self.cursor.description:
            coldesc = list(coldesc)
            coldesc[2:6] = []
            columns.append(coldesc[0])
            # columns.append(coldesc)
            namesize = len(coldesc[0])
            if namesize > maxnamesize:
                maxnamesize = namesize

        # fmt = "{{nr:3}} {{name:{0}}} {{type}} {{null}}".format(maxnamesize + 1)
        # colnr = 1
        # for column in columns:
        #     (colname, fieldtype, nullok, colflags) = column
        #     print(fmt.format(
        #         nr=colnr,
        #         name=colname,
        #         null='NOT NULL' if nullok else 'NULL',
        #         type=FieldFlag.get_info(colflags)
        #     ))
        #     colnr += 1
        return columns

    def printErr(self):
        eType, eVal, eTB = sys.exc_info()
        errorString = {
            'err': repr(traceback.format_tb(eTB)),
            'type': eType,
            'val': eVal
            }
        for k, v in errorString.items():
            print >> sys.stderr, v 
        return errorString

if __name__ == "__main__":
    info = {}
    print(Entity().getColNames("user"))

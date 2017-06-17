#!C:/Python27/python
from os import *
from cgi import *
import cgitb
from lib.Entity import Entity

# cgitb.enable()

class Category(Entity):
    def __init__(self, *qInfo, **kwargs):
        super(Category, self).__init__()
        for dictionary in qInfo:
            for key in dictionary:
                setattr(self, 'c_' + key, dictionary[key])

        for key in kwargs:
            setattr(self, key, kwargs[key])

    def sanitizeParams(self):
        return {k[2:]: v
            for k, v in self.__dict__.items()
            if k.startswith('c_')
        }

    def getCategories(self):
        """ insert new question """
        query = ("SELECT c_id, c_text FROM category WHERE active = 1")
        return self.executeQuery(query, ())

    def test(self):
        return self.__dict__.items()


def main():
    info = { }
    ctype="text/html"
    print("Content-Type: %s; charset=utf-8\n\n" % ctype)
    print(Category(info).getCategories())

if __name__ == '__main__':
        main()

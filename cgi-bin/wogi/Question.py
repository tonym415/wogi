#!C:/Python27/python
from os import *
from cgi import *
import cgitb
import json
import ast
from lib.Entity import Entity

# cgitb.enable()


class Question(Entity):
    def __init__(self, *qInfo, **kwargs):
        super(Question, self).__init__()
        for dictionary in qInfo:
            for key in dictionary:
                setattr(self, 'q_' + key, str(dictionary[key]))

        for key in kwargs:
            setattr(self, key, kwargs[key])

    def sanitizeParams(self):
        return {k[2:]: v
                for k, v in self.__dict__.items()
                if k.startswith('q_')
                }

    def updateQuestion(self):
        """ update question text"""
        params = self.sanitizeParams()
        query = ("UPDATE question "
                 "SET q_text = %(q_text)s "
                 ",q_category_id = %(q_category_id)s "
                 "WHERE q_id in (%(q_id)s)")
        self.executeModifyQuery(query, params)

    def addQuestion(self):
        """ insert new question """
        params = self.sanitizeParams()
        if 'q_text' in params:
            params['q_type'] = 'checkbox'
            query = ("INSERT INTO question (q_text, q_category_id, q_type)"
                     " VALUES (%(q_text)s, %(q_category_id)s, %(q_type)s)")
            return self.executeModifyQuery(query, params)
        else:
            """ indicator of radio group """
            questions = json.loads(params['q_text_group'])
            """ find the next group value """
            # for question in questions:
            query = ("SELECT COALESCE(max(q_group), 0) as id FROM `question` WHERE `q_category_id` = %s" %
                     params['q_category_id'])
            val = self.executeQuery(query, ())[0]
            groupID = 1 if val['id'] is None else val['id'] + 1
            ret = []
            for q in questions:
                param2 = {
                    'q_category_id': params['q_category_id'],
                    'q_text': q["question"],
                    'q_type': 'radio',
                    'q_group': groupID
                }
                query = ("INSERT INTO question (q_text, q_group, q_category_id, q_type)"
                         " VALUES (%(q_text)s, %(q_group)s, %(q_category_id)s, %(q_type)s)")
                ret.append(self.executeModifyQuery(query, param2))
            return ret

    def search(self):
        """ Parse search params for w2ui.grid

            The search object has the following structure
            search = {
                field    : '',   // search field name
                value    : '',   // field value (array of two values for operators: between, in)
                type     : '',   // type of the field, if not defined search.type for the field will be used
                operator : ''    // search operator, can be 'is', 'between', 'begins with', 'contains', 'ends with'
                                 // if not defined it will be selected based on the type
            }
        """
        where = ""
        sort = ""
        params = self.sanitizeParams()
        if "search" in params:
            searches = ast.literal_eval(params['search'])
            ops = {
                'is': '=',   # equal
                'less': '<',   # less than
                'more': '>',   # greater than
                'begins': 'LIKE',  # begins with
                'ends': 'LIKE',  # ends with
                'contains': 'LIKE',  # contains
                'between': 'BETWEEN'  # between to values
            }

            def getWhereClause(col, oper, val):
                col = "q." + col
                if oper == 'between':
                    val = "%s BETWEEN %d AND %d" % (col, val[0], val[1])
                    return val
                elif oper == 'begins':
                    val += '%'
                elif oper == 'ends':
                    val += '%' + val
                elif oper == 'contains':
                    val = '%' + val + '%'
                return " %s %s '%s' " % (col, ops[oper], val)

            where = " WHERE"
            for idx in range(len(searches)):
                if idx > 0:
                    where += "%s " % (params['searchLogic'])
                where += getWhereClause(searches[idx]['field'],
                                        searches[idx]['operator'], searches[idx]['value'])

        if 'sort' in params:
            sortValues = ast.literal_eval(params['sort'])
            asc = []
            desc = []
            for idx in range(len(sortValues)):
                if sortValues[idx]['direction'] == 'asc':
                    asc.append('q.' + sortValues[idx]['field'])
                else:
                    desc.append('q.' + sortValues[idx]['field'])

            if len(asc) > 0:
                sort = " ORDER BY {} ASC".format(*asc)
                if len(desc) > 0:
                    sort += ",{} DESC".format(*desc)
            elif len(desc) > 0:
                sort = " ORDER BY {} DESC".format(*desc)

        query = """SELECT q.*, q.q_group as q_bool, c_text as category FROM `question` q INNER JOIN Category c on c.c_id=q.q_category_id"""
        query += "" if where == "" else where
        query += "" if sort == "" else sort
        query += " LIMIT " + params['limit'] + " OFFSET " + params['offset']
        result = self.executeQuery(query, params)

        return {
            "stm": self.cursor.statement,
            "total": len(result),
            "records": result
        }

    def sort(self):
        ret = self.search()
        return ret

    def delete(self):
        params = self.sanitizeParams()
        # params['q_type'] = 'checkbox'
        params['q_id'] = json.loads(params['selected'])
        params['q_id'] = ','.join(map(str, params['q_id']))
        query = ("UPDATE question SET active = 0 WHERE q_id in (%(q_id)s)") % params
        query = query.replace("'", "")
        return self.executeModifyQuery(query, ())
        # return self.cursor.statement

    def getUniqueQuestionCount(self, dictQuestions):
        from collections import defaultdict
        from operator import itemgetter, attrgetter
        numQuestions = 0
        # get the count of unique groups in questions
        q_group = itemgetter('q_group')
        d = defaultdict(list)
        for q in dictQuestions:
            k = q_group(q)
            d[k].append(q)

        # return len(d)
        # return len(dictQuestions)
        if len(d) > 1:
            # account for the group of null values in q_group
            if None in d.keys():
                numQuestions = len(d) + (len(d[None]) - 1)
            else:
                numQuestions = len(d)
        else:
            numQuestions = len(dictQuestions)
        # return numQuestions, d
        return numQuestions

    def getQTemplate(self):
        try:
            # get category information
            params = self.sanitizeParams()
            query = ("SELECT * FROM  category "
                     "WHERE c_id = %(q_category_id)s and active = 1")
            catInfo = self.executeQuery(query, params)[0]
            params.update(catInfo)
            questions = self.getQuestionsByCat()

            # get the value of each question based on number of questions
            numQuestions = self.getUniqueQuestionCount(questions)
            # return numQuestions
            value = 9.99 / numQuestions

            tempData = {
                "checkbox": {
                    "labelClass": "form-check-label",
                    # "inputType": "checkbox",
                    "inputClass": "form-check-input"
                },
                "radio": {
                    "labelClass": "radio-inline",
                    # "inputType": "radio",
                    "inputClass": "form-check-input"
                }
            }
            snippet = "<legend>%(c_description)s</legend>" % params
            qTemplate = """
                <label class="%(labelClass)s question">
                  <input type="%(inputType)s" class="%(inputClass)s question" name="opt%(c_short_name)s" id="opt%(q_name)s" value="%(value)s">
                 %(q_text)s
              </label><br />
            """
            idx = 0
            currentGroup = 0
            arrContext = []
            for q in questions:
                q['c_short_name'] = params['c_short_name']
                q['value'] = value
                if currentGroup == 0:
                    currentGroup = q['q_group']
                    if currentGroup is None:
                        q['q_name'] = q['q_id']
                    else:
                        q['q_name'] = currentGroup
                elif currentGroup == q['q_group']:
                    q['q_name'] = currentGroup
                else:
                    q['q_name'] = q['q_id']

                context = tempData[q['q_type']].copy()
                context.update(q)
                arrContext.append(context)
                # snippet += qTemplate % context

            return {'description': params['c_description'],
                    'fields': arrContext}
            # return snippet
        except Exception as e:
            return self.printErr()

    def getQuestionsByCat(self):
        """ get user information by name """
        query = ("SELECT q_id, q_text, q_type, q_group FROM  question "
                 "WHERE q_category_id = %(q_category_id)s and active = 1")
        params = self.sanitizeParams()
        return self.executeQuery(query, params)

    def getAllQuestions(self):
        """ get user information by name """
        params = self.sanitizeParams()
        query = """SELECT q.*,q.q_id as recid, q.q_group as q_bool, c_text as category FROM `question` q INNER JOIN Category c on c.c_id=q.q_category_id"""
        if params['limit']:
            query += " LIMIT " + params['limit'] + \
                " OFFSET " + params['offset']
        result = self.executeQuery(query, params)
        return {
            "stm": self.cursor.statement,
            "total": len(result),
            "records": result
        }

    def test(self):
        return self.__dict__.items()


def main():
    info = {
        'q_category_id': 1,
        'q_id': 1,
        'q_text': "",
        'q_group': 'on',
        'q_text_group': '[{"recid":1,"question":"sdfafdf", "q_category_id": 1},{"recid":2,"question":"dfsfsdfd", "q_category_id": 1}]',
        'id': 'Question',
        'selected': '[42,43,44]',
        'function': 'delete',
    }
    print("Content-Type: application/json; charset=utf-8\n\n")
    data = Question(info).test()
    print(json.dumps(data, default=str))


if __name__ == '__main__':
    main()

import csv
import json

import requests


def parseData(data):
    patients = {}
    rd = csv.reader(data.splitlines(), delimiter="\t", quotechar='"')
    header = next(rd, None)
    for row in rd:
        caseID=row[0]
        seperators = [pos for pos, char in enumerate(caseID) if char == "_"]
        if not caseID[0:seperators[0]] in patients:
            patients[caseID[0:seperators[0]]] = {}
        timepoint = ""
        index = 1
        if len(seperators) == 2:
            timepoint = caseID[seperators[0] + 1:seperators[1]]
            index = caseID[seperators[1] - 1]
        else:
            timepoint = caseID[seperators[0] + 1:len(caseID)]
            if caseID[len(caseID) - 1].isdigit():
                index = caseID[len(caseID) - 1]
        if timepoint == "Pri":
            patients[caseID[0:seperators[0]]][0] = {"timepoint": timepoint}
            index = 0
        else:
            patients[caseID[0:seperators[0]]][int(index)] = {"timepoint": timepoint}
        for i in range(1, len(header)):
            patients[caseID[0:seperators[0]]][int(index)][header[i]] = row[i]
    return [patients,header]


def parseGeneData(data):
    rd = csv.reader(data.splitlines(), delimiter="\t", quotechar='"')
    patients={}
    header=[]
    next(rd,None)
    next(rd,None)
    samples=next(rd,None)
    samples=samples[2:len(samples)]
    count=0
    for sample in samples:
        seperators = [pos for pos, char in enumerate(sample) if char == "_"]
        if not sample[0:seperators[0]] in patients:
            patients[sample[0:seperators[0]]] = {}
        index = 1
        if len(seperators) == 2:
            timepoint = sample[seperators[0] + 1:seperators[1]]
            index = sample[seperators[1] - 1]
        else:
            timepoint = sample[seperators[0] + 1:len(samples)]
            if sample[len(sample) - 1].isdigit():
                index = sample[len(sample) - 1]
        if timepoint == "Pri":
            patients[sample[0:seperators[0]]][0] = {"timepoint": timepoint,"csvIndex":count+2}
            index = 0
        else:
            patients[sample[0:seperators[0]]][int(index)] = {"timepoint": timepoint, "csvIndex":count+2}
        count+=1
    for row in rd:
        for patient in patients:
            for timepoint in patients[patient]:
                patients[patient][timepoint][row[1]]=row[patients[patient][timepoint]["csvIndex"]]
        header.append(row[1])
    return patients,header



def getCounts(patients,category):
    counter = 0
    proceed = True
    counters = {"category":category,"data":[]}
    while proceed:
        counters["data"].append({})
        for patient in patients:
                if counter in patients[patient] and (counter + 1) in patients[patient]:
                    current = patients[patient][counter][category]+" (timepoint "+str(counter)+")"
                    next = patients[patient][counter + 1][category]+" (timepoint "+str(counter+1)+")"
                    if not (current, next) in counters["data"][len(counters["data"]) - 1]:
                        counters["data"][len(counters["data"]) - 1][(current, next)] = 0
                    counters["data"][len(counters["data"]) - 1][(current, next)] += 1
        counter += 1
        if not counters["data"][len(counters["data"]) - 1]:
            del counters["data"][-1]
            proceed = False
    return counters

def getIndex(nodes,name):
    for i in range (0,len(nodes)):
        if nodes[i]["name"]==name:
            return i
    return -1

def writeFile(counters,categories):
    outputArray = []
    for i in range(0,len(categories)):
        helper={"category":categories[i],"data":{}}
        helper["data"]["nodes"]=[]
        helper["data"]["links"]=[]
        for element in counters[i]["data"]:
            for key in element:
                if {"name": key[0]} not in helper["data"]["nodes"]:
                    helper["data"]["nodes"].append({"name":key[0]})
                if {"name": key[1]} not in helper["data"]["nodes"]:
                    helper["data"]["nodes"].append({"name":key[1]})
                helper["data"]["links"].append({"source":getIndex(helper["data"]["nodes"],key[0]),"target":getIndex(helper["data"]["nodes"],key[1]),"value":element[key]})
        outputArray.append(helper)
    with open('sankeyData.json', 'w') as outfile:
        json.dump(outputArray, outfile)

def loadData():
    cmd="cmd=getClinicalData&case_set_id=lgg_ucsf_2014_all"
    r = requests.get("http://www.cbioportal.org/webservice.do?"+cmd)
    return r.text

def loadGeneData():
    cmd="cmd=getProfileData&case_set_id=lgg_ucsf_2014_all&genetic_profile_id=lgg_ucsf_2014_mutations&gene_list=TP53,CDKN2A"
    r = requests.get("http://www.cbioportal.org/webservice.do?"+cmd)
    return r.text

def main():
    clincalData=loadData()
    #geneData=loadGeneData()
    patientsClincal = parseData(clincalData)
    #patientsGenes=parseGeneData(geneData)
    clinicalCategories=["CANCER_TYPE_DETAILED","GRADE","IDH1_MUTATION","MGMT_STATUS","NON_SILENT_MUT_TP53_ATRX_CIC_FUBP1","STATUS_1P_19Q"]
    counters=[]
    for category in clinicalCategories:
        counters.append(getCounts(patientsClincal[0],category))
    #for gene in patientsGenes[1]:
    #    counters.append(getCounts(patientsGenes[0],gene))
    writeFile(counters,clinicalCategories)


if __name__ == "__main__":
    main()

import csv
import json

import requests


def parse_clinical_data(data):
    """
    parses clinical data in a dictionary. Unravel timepoints and assign them to patients
    :param data: raw data
    :return: dictionary
    """
    patients = {}
    rd = csv.reader(data.splitlines(), delimiter="\t", quotechar='"')
    header = next(rd, None)
    for row in rd:
        sample_id = row[0]
        # seperate sample_id at "_" symbols to unravel timepoint information
        seperators = [pos for pos, char in enumerate(sample_id) if char == "_"]
        # add new patient to dict if patient doesn't exist yet
        if not sample_id[0:seperators[0]] in patients:
            patients[sample_id[0:seperators[0]]] = {}
        timepoint = ""
        index = 1
        if len(seperators) == 2:
            timepoint = sample_id[seperators[0] + 1:seperators[1]]
            if sample_id[seperators[1]-1].isdigit():
                index = int(sample_id[seperators[1] - 1])
        else:
            timepoint = sample_id[seperators[0] + 1:len(sample_id)]
            if sample_id[len(sample_id) - 1].isdigit():
                index = int(sample_id[len(sample_id) - 1])
        if timepoint == "Pri":
            patients[sample_id[0:seperators[0]]][0] = {"timepoint": timepoint}
            index = 0
        else:
            patients[sample_id[0:seperators[0]]][int(index)] = {"timepoint": timepoint}
        for i in range(1, len(header)):
            patients[sample_id[0:seperators[0]]][int(index)][header[i]] = row[i]
    return [patients, header]


def parse_gene_data(data):
    """
    parses gene data to a dictionary
    :param data: raw data
    :return: dictionary
    """
    rd = csv.reader(data.splitlines(), delimiter="\t", quotechar='"')
    patients = {}
    header = []
    next(rd, None)
    next(rd, None)
    samples = next(rd, None)
    samples = samples[2:len(samples)]
    count = 0
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
            patients[sample[0:seperators[0]]][0] = {"timepoint": timepoint, "csvIndex": count + 2}
            index = 0
        else:
            patients[sample[0:seperators[0]]][int(index)] = {"timepoint": timepoint, "csvIndex": count + 2}
        count += 1
    for row in rd:
        for patient in patients:
            for timepoint in patients[patient]:
                patients[patient][timepoint][row[1]] = row[patients[patient][timepoint]["csvIndex"]]
        header.append(row[1])
    return patients, header


def get_counts(patients, category):
    """
    gets counts between the different states of a category
    :param patients: data for each patient
    :param category: category for which the state transitions are counted
    :return: counts
    """
    counter = 0
    proceed = True
    counters = {"category": category, "data": []}
    while proceed:
        counters["data"].append({})
        for patient in patients:
            if counter in patients[patient] and (counter + 1) in patients[patient]:
                current_state = patients[patient][counter][category] + " (timepoint " + str(counter) + ")"
                next_state = patients[patient][counter + 1][category] + " (timepoint " + str(counter + 1) + ")"
                if not (current_state, next_state) in counters["data"][len(counters["data"]) - 1]:
                    counters["data"][len(counters["data"]) - 1][(current_state, next_state)] = 0
                counters["data"][len(counters["data"]) - 1][(current_state, next_state)] += 1
        counter += 1
        if not counters["data"][len(counters["data"]) - 1]:
            del counters["data"][-1]
            proceed = False
    return counters


def get_index(nodes, name):
    """
    gets the index of a node by name
    :param nodes: nodes in sankey diagram
    :param name: name to search
    :return: index if found, -1 if no name was not found
    """
    for i in range(0, len(nodes)):
        if nodes[i]["name"] == name:
            return i
    return -1


def write_file(counters, categories):
    """
    writes the parsed an counted data to a JSON file which can easily be used as a basis for the sankey diagram
    :param counters: state transitions and counters
    :param categories: categories/properties which shall be contained in the output file
    :return:
    """
    output_array = []
    for i in range(0, len(categories)):
        helper = {"category": categories[i], "data": {}}
        helper["data"]["nodes"] = []
        helper["data"]["links"] = []
        for element in counters[i]["data"]:
            for key in element:
                if {"name": key[0]} not in helper["data"]["nodes"]:
                    helper["data"]["nodes"].append({"name": key[0]})
                if {"name": key[1]} not in helper["data"]["nodes"]:
                    helper["data"]["nodes"].append({"name": key[1]})
                helper["data"]["links"].append({"source": get_index(helper["data"]["nodes"], key[0]),
                                                "target": get_index(helper["data"]["nodes"], key[1]),
                                                "value": element[key]})
        output_array.append(helper)
    with open('sankeyData.json', 'w') as outfile:
        json.dump(output_array, outfile)


def load_clinical_data():
    """
    Loads clinical data with the cBIO APO
    :return: clinical data in tsv format
    """
    cmd = "cmd=getClinicalData&case_set_id=lgg_ucsf_2014_all"
    r = requests.get("http://www.cbioportal.org/webservice.do?" + cmd)
    return r.text


def load_gene_data():
    """
    Loads gene data with the cBIO API
    :return: gene data in tsv format
    """
    cmd = "cmd=getProfileData&case_set_id=lgg_ucsf_2014_all&genetic_profile_id=lgg_ucsf_2014_mutations&gene_list=TP53,CDKN2A"
    r = requests.get("http://www.cbioportal.org/webservice.do?" + cmd)
    return r.text


def main():
    clincal_data = load_clinical_data()
    # geneData=loadGeneData()
    patients_clincal = parse_clinical_data(clincal_data)
    # patientsGenes=parseGeneData(geneData)
    clinical_categories = ["CANCER_TYPE_DETAILED", "GRADE", "IDH1_MUTATION", "MGMT_STATUS",
                           "NON_SILENT_MUT_TP53_ATRX_CIC_FUBP1", "STATUS_1P_19Q"]
    counters = []
    for category in clinical_categories:
        counters.append(get_counts(patients_clincal[0], category))
    # for gene in patientsGenes[1]:
    #    counters.append(getCounts(patientsGenes[0],gene))
    write_file(counters, clinical_categories)


if __name__ == "__main__":
    main()

/**
 * Created by theresa on 30.01.18.
 */
import React from "react";
import ReactDOM from "react-dom";
import Menu from "./lib/Menu.jsx";
import GetStudy from "./lib/GetStudy.jsx";
import SankeyDiagram from "./lib/SankeyDiagram.jsx";
import Summary from "./lib/Summary.jsx";
import {observer} from 'mobx-react';
import {extendObservable} from "mobx";


class DataChange {
    constructor() {
        extendObservable(this, {
            dataParsed: false,
            numberOfPatients: 0,
            numberOfSamples: 0,
            numberOfTimepoints: 0,
            sankeyCategories: [],
            patientData: {},
            counts: {},
            sankeyData: {}
        });
    }

    setSankeyData(data) {
        this.sankeyData = data;
    }

    setNumPatients(number) {
        this.numberOfPatients = number;
    }

    setNumSamples(number) {
        this.numberOfSamples = number;
    }

    setNumTimepoints(number) {
        this.numberOfTimepoints = number;
    }

    setPatientData(patients) {
        this.patientData = patients;
    }

    setSankeyCategories(categories) {
        this.sankeyCategories = categories;
    }

    setCounts(counts) {
        this.counts = counts;
    }

    setParsed(parsed) {
        this.dataParsed = parsed;
    }
}

const dataChange = new DataChange();
const StudySelection = observer(class StudySelection extends React.Component {
    render() {
        return (
            <div>
                <h1> Test Visualizations</h1>
                <GetStudy dataChange={this.props.curr}/>
            </div>
        )
    }
});
const SummarizeData = observer(class SummarizeData extends React.Component {
    render() {
        return (
            <div>
                <h3>Summary of the Data</h3>
                <div className="bottom-right-svg">
                    <Summary dataChange={this.props.curr}/>
                </div>
            </div>
        )
    }
});
const Plot = observer(class Plot extends React.Component {
        dataAvailable() {
            if (this.props.curr.dataParsed) {
                return (
                    <div>
                        <h3>Sankey diagram</h3>
                        <div className="bottom-right-svg">
                            <Menu dataChange={this.props.curr}/>
                            <SankeyDiagram id="sankeyDiagram" data={this.props.curr.sankeyData}/>
                        </div>
                    </div>
                )
            }
            else return (
                <div></div>
            )
        }

        render() {
            return (
                this.dataAvailable()
            )
        }
    }
);
ReactDOM.render(<StudySelection curr={dataChange}/>, document.getElementById("choosedata"));
ReactDOM.render(<SummarizeData curr={dataChange}/>, document.getElementById("summary"));
ReactDOM.render(<Plot curr={dataChange}/>, document.getElementById("top-line-chart"));

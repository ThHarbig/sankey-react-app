/**
 * Created by theresa on 30.01.18.
 */
import React from "react";
import ReactDOM from "react-dom";
import {observer} from 'mobx-react';

import ObservableParser from "./lib/utils/ObservableParser.jsx";

import ChooseSankeyCategory from "./lib/selectors/ChooseSankeyCategory.jsx";
import ChoosePatient from "./lib/selectors/ChooseEvent.jsx";
import GetStudy from "./lib/selectors/GetStudy.jsx";

import SankeyDiagram from "./lib/charts/SankeyDiagram.jsx";
import Timeline from "./lib/charts/Timeline.jsx";
import MultipleHist from "./lib/charts/MultipleHist.jsx"
import Summary from "./lib/charts/Summary.jsx";

const parser=new ObservableParser();

const StudySelection = observer(class StudySelection extends React.Component {
    render() {
        return (
            <div>
                <h1> Test Visualizations</h1>
                <GetStudy dataChange={this.props.curr} parser={parser}/>
            </div>
        )
    }
});
const SummarizeData = observer(class SummarizeData extends React.Component {
    render() {
        if (parser.parsed) {
            return (
                <div>
                    <h3>Summary of the Data</h3>
                    <div className="bottom-right-svg">
                        <Summary data={this.props.parser}/>
                    </div>
                </div>
            )
        }
        else return null;

    }


});
const Sk = observer(class Sk extends React.Component {
    render() {
        if (parser.parsed) {
            return (
                <div>
                    <h3>Sankey diagram</h3>
                    <div className="bottom-right-svg">
                        <ChooseSankeyCategory parser={this.props.parser}/>
                        <SankeyDiagram id="sankeyDiagram" data={this.props.parser.currentSankeyData}/>
                    </div>
                </div>
            )
        }
        else return null;
    }

});
const Tl = observer(class Tl extends React.Component {
        render() {
            if (parser.parsed) {
                return (
                    <div>
                        <h3>Timeline</h3>
                        <div className="bottom-right-svg">
                            <ChoosePatient parser={this.props.parser}/>
                            <Timeline currEvents={this.props.parser.currentEvents}
                                      sampleEvents={this.props.parser.sampleEvents}/>
                        </div>
                    </div>
                )
            }
            else return (
                null
            )
    }
});
const Histograms = observer(class Histograms extends React.Component {
    render() {
        if(parser.parsed) {
            return (
                <div>
                    <h3>Histograms of Mutation Counts</h3>
                    <div className="bottom-right-svg">
                        <MultipleHist id="histograms" data={this.props.data}/>
                    </div>
                </div>
            )
        }
        else return null;
    }

});
ReactDOM.render(<StudySelection parser={parser}/>, document.getElementById("choosedata"));
ReactDOM.render(<SummarizeData parser={parser}/>, document.getElementById("summary"));
ReactDOM.render(<Tl parser={parser}/>, document.getElementById("timeline"));
ReactDOM.render(<Sk parser={parser}/>, document.getElementById("top-line-chart"));
ReactDOM.render(<Histograms data={[parser.countsFirstTP,parser.countsSecondTP]}/>, document.getElementById("hist"));

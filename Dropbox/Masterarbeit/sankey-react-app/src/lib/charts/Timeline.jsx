import React from 'react';
import ReactDOM from 'react-dom'
import {observer} from "mobx-react"
import * as d3 from 'd3';
import ReactMixins from "../utils/ReactMixins.js";
import TimelineToolTip from "./TimelineToolTip.jsx";

class Axis extends React.Component {

    componentDidUpdate() {
        this.renderAxis();
    }

    componentDidMount() {
        this.renderAxis()
    }

    renderAxis() {
        const node = ReactDOM.findDOMNode(this);
        d3.select(node).call(this.props.axis);
    }

    render() {
        const translatex = "translate(0," + (this.props.h + 10) + ")";
        const translatey = "translate(-20, 0)";
        return (
            <g className="axis" transform={this.props.axisType === 'x' ? translatex : translatey}>
            </g>
        );
    }

}

const Timeline = observer(class Timeline extends React.Component {
    constructor() {
        super();
        this.state = {
            width: 0,
            tooltip: {display: false, data: []},
        };
        this.showToolTip = this.showToolTip.bind(this);
        this.hideToolTip = this.hideToolTip.bind(this);
                ReactMixins.call(this);

    }

    showToolTip(e, data,type) {
        let pos={};
        if(type==="rect"){
            pos={
                x: e.target.getAttribute("x"),
                y: e.target.getAttribute("y")
            }
        }
        else{
            pos={
                x: e.target.getAttribute("cx"),
                y: e.target.getAttribute("cy")
            }
        }
        this.setState({
            tooltip: {
                display: true,
                data: data.attributes,
                pos: pos
            }
        });
    }

    hideToolTip(e) {
        this.setState({tooltip: {display: false, data: []}});

    }

    getLastTimepointInCategory(events) {
        let lastTimepoint = 0;
        events.forEach(function (d) {
            if (d.events.length !== 0) {
                const lastEntry = d.events[d.events.length - 1];
                if ("endNumberOfDaysSinceDiagnosis" in lastEntry) {
                    if (lastEntry["endNumberOfDaysSinceDiagnosis"] > lastTimepoint) {
                        lastTimepoint = lastEntry["endNumberOfDaysSinceDiagnosis"];
                    }
                }
                else {
                    if (lastEntry["startNumberOfDaysSinceDiagnosis"] > lastTimepoint) {
                        lastTimepoint = lastEntry["startNumberOfDaysSinceDiagnosis"];
                    }
                }
            }
        });
        return lastTimepoint;
    }

    getLastTimepoint() {
        const _self = this;
        let lastTimepoint = 0;
        lastTimepoint = this.getLastTimepointInCategory(this.props.sampleEvents.events);
        this.props.currEvents.forEach(function (d, i) {
            const timepoint = _self.getLastTimepointInCategory(d.events);
            if (lastTimepoint < timepoint) {
                lastTimepoint = timepoint
            }
        });
        return (lastTimepoint)
    }

    createLines(x, y) {
        let lines = [];
        let lastTimepoint = this.getLastTimepoint();
        this.props.sampleEvents.events.forEach(function (d) {
            lines.push(
                <line key={d.patient} x1={0} x2={x(lastTimepoint)} y1={y(d.patient)} y2={y(d.patient)}
                      stroke="lightgray">
                </line>
            )
        });
        return lines
    }

    createDots(x, y, data, opacity) {
        let dates = [];
        const _self = this;
        data.events.forEach(function (d) {
            d.events.forEach(function (f, i) {
                const transform = 'translate(' + x(f.startNumberOfDaysSinceDiagnosis) + ',' + y(d.patient) + ')';
                if ("endNumberOfDaysSinceDiagnosis" in f) {
                    dates.push(
                        <rect opacity={opacity} key={data.type + d.patient + "" + i} x={x(f.startNumberOfDaysSinceDiagnosis)} y={y(d.patient)-5}
                              height="10" width={x(f.endNumberOfDaysSinceDiagnosis - f.startNumberOfDaysSinceDiagnosis)}
                              fill={data.color} onMouseEnter={(e) => {
                            _self.showToolTip(e, f, "rect")
                        }} onMouseLeave={_self.hideToolTip}/>
                    )
                }
                else {
                    dates.push(
                        <circle opacity={opacity} key={data.type + d.patient + "" + i} cx={x(f.startNumberOfDaysSinceDiagnosis)} cy={y(d.patient)} r="5"
                                fill={data.color} onMouseEnter={(e) => _self.showToolTip(e, f, "circle")}
                                onMouseLeave={_self.hideToolTip}/>
                    )
                }
            })
        });
        return dates;

    }

    createAllDots(x, y) {
        const _self = this;
        let dots = [];
        this.props.currEvents.forEach(function (d) {
            dots = dots.concat(_self.createDots(x, y, d, 0.7))
        });
        return dots;
    }
    getMax(attributes,type){
        let max=0;
        for(let patient in attributes){
            if(max<attributes[patient][type]){
                max=attributes[patient][type];
            }
        }
        console.log(max);
        return max;
    }
    createBars(y,x){
        let bars=[];
        console.log(this.props.patientAttributes);
        for(let patient in this.props.patientAttributes){
            bars.push(<rect height={10} width={x(this.props.patientAttributes[patient]["AGE"])} y={y(patient)-5} fill="blue"/>)
        }
        return bars;
    }
    render() {
        const margin = {top: 20, right: 50, bottom: 30, left: 50},
            w = this.state.width - (margin.left + margin.right),
            h = this.props.height - (margin.top + margin.bottom);
        const transformTimeline = 'translate(' + margin.left + ',' + margin.top + ')';
        const transformBars='translate(' + (margin.left+w*0.85) + ',' + margin.top + ')';

        const x = d3.scaleLinear()
            .domain([0, this.getLastTimepoint()])
            .range([0, 0.8*w]);
        const y = d3.scalePoint()
            .domain(this.props.sampleEvents.events.map(function (d) {
                return d.patient;
            }))
            .range([0, h]);
         let barScale=d3.scaleLinear()
            .domain([0, this.getMax(this.props.patientAttributes,"AGE")])
            .range([0, 0.15*w]);
        const xAxis = d3.axisBottom()
            .scale(x);
        const yAxis = d3.axisLeft()
            .scale(y);
        const barAxis=d3.axisBottom()
            .scale(barScale);
        return (
            <div>
                <svg id={this.props.chartId} width={this.state.width} height={this.props.height}>
                    <g transform={transformTimeline}>
                        <Axis h={h} axis={yAxis} axisType="y"/>
                        <Axis h={h} axis={xAxis} axisType="x"/>
                        {this.createLines(x, y)}
                        {this.createDots(x, y, this.props.sampleEvents, 1)}
                        {this.createAllDots(x, y)}
                        <TimelineToolTip tooltip={this.state.tooltip}/>
                    </g>
                    <g transform={transformBars}>
                        {this.createBars(y,barScale)}
                        <Axis h={h} axis={barAxis} axisType="x"/>
                    </g>
                </svg>
            </div>
        )
    }
});

Timeline.defaultProps = {
    width: 1000,
    height: 300,
    chartId: 'timeline'
};
export default Timeline;
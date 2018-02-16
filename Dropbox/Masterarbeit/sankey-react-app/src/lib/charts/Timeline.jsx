import React from 'react';
import ReactDOM from 'react-dom'
import {observer} from "mobx-react"
import * as d3 from 'd3';
import ReactMixins from "../utils/ReactMixins.js";

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
        const translatex = "translate(0," + (this.props.h+10) + ")";
        const translatey = "translate(-20, 0)";
        return (
            <g className="axis" transform={this.props.axisType === 'x' ? translatex : translatey}>
            </g>
        );
    }

}
const Timeline=observer(class Timeline extends React.Component {
    constructor() {
        super();
        this.state = {
            width: 1000,
        };
        ReactMixins.call(this);
    }

    getLastTimepoint() {
        let lastTimepoint = 0;
        this.props.sampleEvents.events.forEach(function (d) {
            if(d.events.length!==0) {
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
        return (lastTimepoint)
    }

    createLines(x, y) {
        let lines = [];
        let lastTimepoint=this.getLastTimepoint();
        this.props.sampleEvents.events.forEach(function (d) {
            lines.push(
                <line key={d.patient} x1={0} x2={x(lastTimepoint)} y1={y(d.patient)} y2={y(d.patient)} stroke="lightgray">
                </line>
            )
        });
        return lines
    }
    createDots(x, y,data, opacity){
        let dates =[];
        data.events.forEach(function (d) {
            d.events.forEach(function (e,i) {
                const transform = 'translate(' + x(e.startNumberOfDaysSinceDiagnosis) + ',' + y(d.patient) + ')';
                if ("endNumberOfDaysSinceDiagnosis" in e){
                    dates.push(
                        <rect opacity={opacity} key={data.type+d.patient+""+i} transform={transform} y="-5" height="10" width={x(e.endNumberOfDaysSinceDiagnosis-e.startNumberOfDaysSinceDiagnosis)} fill={data.color}/>
                    )
                }
                else{
                    dates.push(
                        <circle opacity={opacity} key={data.type+d.patient+""+i} transform={transform} r="5" fill={data.color}/>
                    )
                }
            })
                });
        return dates;

    }
    createAllDots(x,y){
        const _self=this;
        let dots=[];
        this.props.currEvents.forEach(function (d) {
            dots=dots.concat(_self.createDots(x,y,d,0.5))
        });
        return dots;
    }
    render() {
        const margin = {top: 20, right: 50, bottom: 30, left: 50},
            w = this.state.width - (margin.left + margin.right),
            h = this.props.height - (margin.top + margin.bottom);
                const transform = 'translate(' + margin.left + ',' + margin.top + ')';

        const x = d3.scaleLinear()
				.domain([0, this.getLastTimepoint()])
				.range([0, w]);
		const y = d3.scalePoint()
				.domain(this.props.sampleEvents.events.map(function (d) {
                    return d.patient;
                }))
				.range([0, h]);
		        const xAxis = d3.axisBottom()
            .scale(x);
        const yAxis = d3.axisLeft()
            .scale(y);
        return (
            <svg width={this.state.width} height={this.props.height}>
                <g transform={transform}>
                <Axis h={h} axis={yAxis} axisType="y"/>
                <Axis h={h} axis={xAxis} axisType="x"/>
                {this.createLines(x,y)}
                {this.createDots(x,y,this.props.sampleEvents,1)}
                {this.createAllDots(x,y)}
                </g>
            </svg>
        )
    }
});

Timeline.defaultProps = {
    width: 1000,
    height: 300
};
export default Timeline;
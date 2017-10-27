// tslint:disable no-console
import { Component, ReactElement, createElement } from "react";

import { Alert } from "../../components/Alert";
import { BarChartContainerProps } from "./BarChartContainer";
import { ChartLoading } from "../../components/ChartLoading";
import { PlotlyChart } from "../../components/PlotlyChart";
import { RuntimeEditor } from "../../components/RuntimeEditor";

import { SeriesData, SeriesProps, getRuntimeTraces, getSeriesTraces } from "../../utils/data";
import deepMerge from "deepmerge";
import { Config, Layout, ScatterData, ScatterHoverData } from "plotly.js";
import { getDimensions, parseStyle } from "../../utils/style";

import "../../ui/Charts.scss";

export interface BarChartProps extends BarChartContainerProps {
    alertMessage?: string | ReactElement<any>;
    loading?: boolean;
    data?: SeriesData[];
    defaultData?: ScatterData[];
    onClick?: (series: SeriesProps, dataObject: mendix.lib.MxObject) => void;
    onHover?: (node: HTMLDivElement, dataObject: mendix.lib.MxObject) => void;
}

interface BarChartState {
    layoutOptions: string;
    data?: SeriesData[];
}

export class BarChart extends Component<BarChartProps, BarChartState> {
    private tooltipNode: HTMLDivElement;

    constructor(props: BarChartProps) {
        super(props);

        this.getTooltipNodeRef = this.getTooltipNodeRef.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onHover = this.onHover.bind(this);
        this.onRuntimeUpdate = this.onRuntimeUpdate.bind(this);
        this.state = {
            layoutOptions: props.layoutOptions,
            data: props.data
        };
    }

    render() {
        if (this.props.alertMessage) {
            return createElement(Alert, {
                className: "widget-charts-bar-alert",
                message: this.props.alertMessage
            });
        }
        if (this.props.loading) {
            return createElement(ChartLoading, { text: "Loading" });
        }
        if (this.props.devMode) {
            return createElement(RuntimeEditor, {
                supportSeries: true,
                layoutOptions: this.state.layoutOptions || "{\n\n}",
                rawData: this.state.data || [],
                chartData: this.getData(this.props),
                modelerConfigs: JSON.stringify(BarChart.defaultLayoutConfigs(this.props), null, 4),
                traces: this.state.data ? this.state.data.map(getRuntimeTraces) : [],
                onChange: this.onRuntimeUpdate
            }, this.renderChart());
        }

        return this.renderChart();
    }

    componentDidMount() {
        if (!this.props.loading) {
            this.renderChart();
        }
    }

    componentWillReceiveProps(newProps: BarChartProps) {
        this.setState({
            layoutOptions: newProps.layoutOptions,
            data: newProps.data
        });
    }

    componentDidUpdate() {
        if (!this.props.loading) {
            this.renderChart();
        }
    }

    private getTooltipNodeRef(node: HTMLDivElement) {
        this.tooltipNode = node;
    }

    private renderChart() {
        return createElement(PlotlyChart,
            {
                type: "bar",
                className: this.props.class,
                style: { ...getDimensions(this.props), ...parseStyle(this.props.style) },
                layout: this.getLayoutOptions(this.props),
                data: this.getData(this.props),
                config: BarChart.getConfigOptions(this.props),
                onClick: this.onClick,
                onHover: this.onHover,
                getTooltipNode: this.getTooltipNodeRef
            }
        );
    }

    private getLayoutOptions(props: BarChartProps): Partial<Layout> {
        const advancedOptions = this.state.layoutOptions ? JSON.parse(this.state.layoutOptions) : {};

        const layoutOptions = deepMerge.all([ {
            autosize: true,
            barmode: props.barMode,
            xaxis: {
                showgrid: props.grid === "vertical" || props.grid === "both",
                title: props.xAxisLabel,
                fixedrange: !props.enableZoom
            },
            yaxis: {
                showgrid: props.grid === "horizontal" || props.grid === "both",
                title: props.yAxisLabel,
                fixedrange: !props.enableZoom
            },
            showlegend: props.showLegend,
            hovermode: "closest"
        }, advancedOptions ]);

        console.log("Layout Options:", layoutOptions);
        return layoutOptions;
    }

    private getData(props: BarChartProps): ScatterData[] {
        let barData: ScatterData[] = props.defaultData || [];
        if (props.data) {
            barData = props.data.map(({ data, series }) => {
                const rawOptions = series.seriesOptions ? JSON.parse(series.seriesOptions) : {};
                const traces = getSeriesTraces({ data, series });
                const configOptions = {
                    name: series.name,
                    type: "bar",
                    hoverinfo: this.props.tooltipForm ? "text" : undefined,
                    x: this.props.orientation === "bar" ? traces.y : traces.x,
                    y: this.props.orientation === "bar" ? traces.x : traces.y,
                    orientation: this.props.orientation === "bar" ? "h" : "v",
                    series
                };

                // deepmerge doesn't go into the prototype chain, so it can't be used for copying mxObjects
                return { ...deepMerge.all<ScatterData>([ configOptions, rawOptions ]), mxObjects: data };
            });
        }

        console.log("Data Options:", barData);
        return barData;
    }

    private onClick(data: ScatterHoverData) {
        const pointClicked = data.points[0];
        if (this.props.onClick) {
            this.props.onClick(pointClicked.data.series, pointClicked.data.mxObjects[pointClicked.pointNumber]);
        }
    }

    private onHover(data: ScatterHoverData) {
        if (this.props.onHover) {
            const activePoint = data.points[0];
            const yAxisPixels = typeof activePoint.y === "number"
                ? activePoint.yaxis.l2p(activePoint.y)
                : activePoint.yaxis.d2p(activePoint.y);
            const xAxisPixels = typeof activePoint.x === "number"
                ? activePoint.xaxis.l2p(activePoint.x as number)
                : activePoint.xaxis.d2p(activePoint.x);
            const positionYaxis = yAxisPixels + activePoint.yaxis._offset;
            const positionXaxis = xAxisPixels + activePoint.xaxis._offset;
            this.tooltipNode.style.top = `${positionYaxis}px`;
            this.tooltipNode.style.left = `${positionXaxis}px`;
            this.tooltipNode.style.opacity = "1";
            this.props.onHover(this.tooltipNode, activePoint.data.mxObjects[activePoint.pointNumber]);
        }
    }

    private onRuntimeUpdate(layoutOptions: string, data: SeriesData[]) {
        this.setState({ layoutOptions, data });
    }

    private static defaultLayoutConfigs(props: BarChartProps): Partial<Layout> {
        return {
            autosize: true,
            barmode: props.barMode,
            hovermode: "closest",
            showlegend: props.showLegend,
            xaxis: {
                title: props.xAxisLabel,
                showgrid: props.grid === "vertical" || props.grid === "both",
                fixedrange: !props.enableZoom
            },
            yaxis: {
                title: props.yAxisLabel,
                showgrid: props.grid === "horizontal" || props.grid === "both",
                fixedrange: !props.enableZoom
            },
            margin: {
                l: 60,
                r: 60,
                b: 60,
                t: 100,
                pad: 4
            }
        };
    }

    private static getConfigOptions(props: BarChartProps): Partial<Config> {
        return { displayModeBar: props.showToolbar, doubleClick: false };
    }
}

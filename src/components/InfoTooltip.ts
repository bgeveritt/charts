import { Component, SyntheticEvent, createElement } from "react";
import "../ui/InfoTooltip.scss";

export interface InfoTooltipProps {
    show?: boolean;
    onClick: () => void;
}

interface InfoTooltipState {
    width?: number;
}

export class InfoTooltip extends Component<InfoTooltipProps, InfoTooltipState> {
    static defaultProps: Partial<InfoTooltipProps> = {
        show: false
    };
    private tooltipNode: HTMLDivElement;

    constructor(props: InfoTooltipProps) {
        super(props);

        this.getRef = this.getRef.bind(this);
        this.onInfoClick = this.onInfoClick.bind(this);
        this.state = {};
    }

    render() {
        return createElement("div", {
            className: "widget-info-tooltip glyphicon glyphicon-info-sign",
            onClick: this.props.onClick,
            ref: this.getRef
        }, this.renderInfo());
    }

    componentDidMount() {
        if (this.tooltipNode && this.tooltipNode.parentElement) {
            this.setState({
                width: this.tooltipNode.parentElement.clientWidth * 0.9
            });
        }
    }

    private getRef(node: HTMLDivElement) {
        this.tooltipNode = node;
    }

    private renderInfo() {
        if (this.props.show) {
            return createElement("div", {
                className: "widget-info-tooltip-info",
                style: this.state.width && { width: `${this.state.width}px` },
                onClick: this.onInfoClick
            }, this.props.children);
        }

        return null;
    }

    private onInfoClick(event: SyntheticEvent<HTMLDivElement>) {
        event.stopPropagation();
    }
}

import { Layout, message, Modal } from "antd";
import * as d3 from "d3";
import { Component, SyntheticEvent } from "react";

import { ApiService } from "../services/ApiService";
import { sortBy } from "../utils";
import { ProgramAddress } from '../utils/constants';
import Loading from "./Loading";
import { Graph } from "./types";
import "./VisualEditor.scss";

const { Content } = Layout;

interface InternalState {
  loading: boolean;
  addGraphLoading: boolean;
  editGraphLoading: boolean;
  showAddLinkModal: boolean;
  showAddGraphModal: boolean;
  showGraphModal: boolean;
  showLinkModal: boolean;
  selectedGraph: any;
  selectedLink: any;
  graphs: any[];
  links: any[];
  scale: number;
  all_graphs: any[];
  copy_all_graphs: any[];
  last_click_id: String;
  collapsedArray: String[];
  collapsedArray_changed: number;
}

class VisualEditor extends Component<any, InternalState> {
  private simulation: any = null;

  constructor(props: any) {
    super(props);

    this.state = {
      loading: true,
      addGraphLoading: false,
      editGraphLoading: false,
      showAddLinkModal: false,
      showAddGraphModal: false,
      showGraphModal: false,
      showLinkModal: false,
      selectedGraph: null,
      selectedLink: null,
      graphs: [],
      links: [],
      all_graphs: [],
      copy_all_graphs: [],
      scale: 100,
      last_click_id: "",
      collapsedArray: [],
      collapsedArray_changed: 0
    };
  }



  public async componentDidMount() {
    const { data: graphs } = await ApiService.fetchGraphs();
    console.log(graphs);
    // const { data: links } = await ApiService.fetchLinks();
    this.setState({ all_graphs: [...graphs] });
    this.setState(state => ({ copy_all_graphs: [...state.all_graphs] }));
    this.setState({ loading: false, graphs }, () => {
      const el = document.getElementById("Neo4jContainer");
      this.defineGraphsAndLinks();
      this.initSimulation(el!, graphs, this.formatLinks());
    });
  }

  public componentDidUpdate(prevProps: Readonly<any>, prevState: Readonly<InternalState>, snapshot?: any): void {
    if (prevState.collapsedArray_changed !== this.state.collapsedArray_changed) {
      this.setState(state => {
        return {all_graphs: [...state.copy_all_graphs]};
      }, () => {
        console.log(this.state.collapsedArray);
        this.setState(state => ({
          all_graphs: state.copy_all_graphs
        }));
        this.traverseGraph(this.state.all_graphs[0]);
        // const a_graph = d3.hierarchy(this.state.all_graphs[0]).descendants();
        const el = document.getElementById("Neo4jContainer");
        
        this.defineGraphsAndLinks();
        this.initSimulation(el!, this.state.graphs, this.formatLinks());
        this.updateSimulation();
      })
    }
  }

  public traverseGraph(d: any) {
    console.log(d.children);
    if(d.children === undefined || d.children === null) {
      return ;
    }
    if(this.state.collapsedArray.indexOf(d.id) > -1) {
      d.children = null;
      return;
    }
    else {
      for(let i = 0; i < d.children.length; i ++) {
        this.traverseGraph(d.children[i]); 
      }
    }
  }

  public initSimulation(el: any, graphs: any[], links: any[]) {
    if (!el) {
      return;
    }

    const width = el.clientWidth;
    const height = el.clientHeight;

    this.simulation = d3
      .forceSimulation(graphs)
      .force(
        "link",
        d3
          .forceLink(links)
          .distance(160)
          .id((d: any) => d.id)
      )
      .force("charge", d3.forceManyBody().distanceMax(300).strength(-800))
      .force("collide", d3.forceCollide().strength(-60))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const svg = d3.select("#Neo4jContainer").append("svg").attr("width", "100%").attr("height", "100%");

    this.onZoom(svg);
    this.addArrowMarker(svg);

    const link = this.initLinks(links, svg);
    const graph = this.initGraphs(graphs, svg);

    this.simulation.on("tick", () => this.handleTick(link, graph));
    this.simulation.alpha(1).restart();
  }

  public restartSimulation(e: SyntheticEvent) {
    e.stopPropagation();
    if (!this.simulation) {
      return;
    }

    this.simulation.alpha(1).restart();
  }

  public handleTick(link: any, graph: any, img?: any) {
    if (link) {
      link.selectAll(".outline").attr("d", (d: any) => this.linkArc(d));
      link.selectAll(".overlay").attr("d", (d: any) => this.linkArc(d));
    }

    graph.attr("transform", (d: any) => `translate(${d.x}, ${d.y})`);
  }

  //when dragging started
  public onDragStarted(d: any) {
    if (!d3.event.active) {
      this.simulation.alphaTarget(0.3).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  //while dragging
  public onDragged(d: any) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  public onDragEnded(d: any) {
    if (!d3.event.active) {
      this.simulation.alphaTarget(0);
    }
  }

  public onZoom(svg: any) {
    svg.call(
      d3.zoom().on("zoom", () => {
        const { transform } = d3.event;
        const scale = Number((transform.k * 100).toFixed());

        if (scale <= 12.5 || scale >= 500) {
          return;
        }

        this.setState({ scale });
        d3.selectAll("#Neo4jContainer > svg > g").attr("transform", transform);
      })
    );
    svg.on("dblclick.zoom", null); 
  }

  public defineGraphsAndLinks() {
    let { links, graphs, all_graphs } = this.state;
    graphs.splice(0);
    links.splice(0);
    console.log(all_graphs);
    console.log(graphs, links);
    
    all_graphs.map(graph => {
      d3.hierarchy(graph).descendants().map(graph => {

        if (graph.children) graph.children.forEach(child => {
          links.push({
            target: graph.data.id,
            source: child.data.id,
            short_libelle_fonction: child.data.short_libelle_fonction
          })
        })
        graphs.push({
          id: graph.data.id,
          denomination: graph.data.Nodedata.denomination,
          img: graph.data.Nodedata.img,
          short_libelle_fonction: graph.data.short_libelle_fonction,
          color: graph.data.Nodedata.color,
          children: graph.data.children
        })
      })
    })

    console.log(graphs, links);
    
  }

  public formatLinks() {
    const { links } = this.state;
    if (!links || !(links && links.length > 0)) {
      return [];
    }

    links.forEach((link: any) => {
      const same = links.filter((d) => d.source === link.target && d.target === link.source);
      const sameSelf = links.filter((d) => d.source === link.source && d.target === link.target);
      const all = sameSelf.concat(same);

      all.forEach((item: any, index: number) => {
        item.sameIndex = index + 1;
        item.sameTotal = all.length;
        item.sameTotalHalf = item.sameTotal / 2;
        item.sameUneven = item.sameTotal % 2 !== 0;
        item.sameMiddleLink = item.sameUneven === true && Math.ceil(item.sameTotalHalf) === item.sameIndex;
        item.sameLowerHalf = item.sameIndex <= item.sameTotalHalf;
        item.sameArcDirection = 1;
        item.sameIndexCorrected = item.sameLowerHalf ? item.sameIndex : item.sameIndex - Math.ceil(item.sameTotalHalf);
      });
    });

    const maxSame = links.concat().sort(sortBy("sameTotal")).slice(-1)[0].sameTotal;

    links.forEach((link) => {
      link.maxSameHalf = Math.round(maxSame / 2);
    });
    return links;
  }

  public initImage(img: string, svg: any) {
    const el = svg.selectAll("image").data([0]);
    el.enter().append("svg:image").attr("xlink:href", img).attr("height", "100%").attr("x", 0).attr("y", 0);
    return el;
  }

  public initLinks(links: any, svg: any) {
    const link = svg
      .append("g")
      .attr("class", "layer links")
      .selectAll("path.outline")
      .data(links, (d: any) => d);

    return this.createLink(link);
  }

  public createLink(link: any) {
    if (!link || (link && !link._enter)) {
      return;
    }

    link = link.enter().append("g").attr("class", "link");

    link
      .append("path")
      .attr("id", (d: any, i: number) => `linkPath${i}`)
      .attr("class", "outline")
      .attr("style", "cursor: pointer")
      .attr("stroke", "#A5ABB6")
      .attr("fill", "none")
      .attr("stroke-width", 1)
      .attr("marker-end", "url(#ArrowMarker)");

    link
      .append("text")
      .attr("class", "link-text")
      .attr("fill", "#A5ABB6")
      .append("textPath")
      .attr("pointer-events", "none")
      .attr("href", (d: any, i: number) => `#linkPath${i}`)
      .attr("startOffset", "50%")
      .attr("font-size", 12)
      .attr("text-anchor", "middle")
      .text((d: any) => {
        if (d.short_libelle_fonction !== "") {
          return d.short_libelle_fonction;
        }
      });

    link
      .append("path")
      .attr("class", "overlay")
      .attr("fill", "none")
      .attr("stroke-opacity", "0.5")
      .attr("stroke-width", "16")
      .style("opacity", "0");

    // init link event
    this.initLinkEvent(link);

    return link;
  }

  public initLinkEvent(link: any) {
    link.on("mouseenter", (d: any, i: number, n: any[]) => {
      const link: any = d3.select(n[i]);

      if (!link._groups[0][0].classList.contains("selected")) {
        link.select(".overlay").attr("stroke", "#68bdf6").style("opacity", 1);
      }
    });

    link.on("mouseleave", (d: any, i: number, n: any[]) => {
      const link: any = d3.select(n[i]);

      if (!link._groups[0][0].classList.contains("selected")) {
        link.select(".overlay").style("opacity", 0);
      }
    });

    link.on("click", (d: any, i: number, n: any[]) => {
      const link: any = d3.select(n[i]);

      if (link._groups[0][0].classList.contains("selected")) {
        link.attr("class", "link");
        link.select(".overlay").style("opacity", 0);
      } else {
        link.attr("class", "link selected");
        link.select(".overlay").attr("stroke", "#FDCC59").style("opacity", 1);
      }

      this.setState({ selectedLink: d });
    });

    link.on("dblclick", () => {
      this.setState({ showLinkModal: true });
    });
  }

  public linkArc(d: any) {
    const dx = d.target.x - d.source.x;
    const dy = d.target.y - d.source.y;
    const dr = Math.sqrt(dx * dx + dy * dy);
    const unevenCorrection = d.sameUneven ? 0 : 0.5;
    const curvature = 2;
    let arc = (1.0 / curvature) * ((dr * d.maxSameHalf) / (d.sameIndexCorrected - unevenCorrection));

    if (d.sameMiddleLink) {
      arc = 0;
    }

    return `M${d.source.x},${d.source.y}A${arc},${arc} 0 0,${d.sameArcDirection} ${d.target.x},${d.target.y}`;
  }

  public drawLink() {
  }

  public initGraphs(graphs: any, svg: any) {
    const graph = svg
      .append("g")
      .attr("class", "layer graphs")
      .selectAll(".graph")
      .data(graphs, (d: any) => d);

    return this.createGraph(graph);
  }

  public createGraph(graph: any) {
    graph = graph
      .enter()
      .append("g")
      .attr("class", "graph")
      .attr("style", "cursor: pointer")
      .call(
        d3
          .drag()
          .on("start", (d) => this.onDragStarted(d))
          .on("drag", (d) => this.onDragged(d))
          .on("end", (d) => this.onDragEnded(d))
      );
    graph.append("circle").attr("r", 40).style("fill", (d: any, i: number) => d.color);
    graph.append("svg:image")
      .attr("class", "circle")
      .attr("xlink:href", (d: any) => (ProgramAddress + "assets/" + (d.img ? d.img : "no_image.png")))
      .attr("x", "-30px")
      .attr('y', '-30px')
      .attr('width', '60px')
      .attr('height', '60px');
    graph
      .append("text")
      .attr("dy", "55")
      .attr("fill", "#000")
      .attr("pointer-events", "none")
      .attr("font-size", "12px")
      .attr("text-anchor", "middle")
      .text((d: any) => d.denomination)

    // init graph event
    this.initGraphEvent(graph);

    return graph;
  }

  public initGraphEvent(graph: any) {
    graph.on("mouseenter", (d: any, i: number, n: any[]) => {
      const graph: any = d3.select(n[i]);

      if (graph._groups[0][0].classList.contains("selected")) {
        return;
      }

      graph.select("circle").attr("stroke", (d: any, i: number) => d.color).attr("stroke-width", "12").attr("stroke-opacity", "0.5");
    });

    graph.on("mouseleave", (d: any, i: number, n: any[]) => {
      const graph: any = d3.select(n[i]);

      if (graph._groups[0][0].classList.contains("selected")) {
        return;
      }

      graph.select("circle").attr("stroke-width", 0);
    });


    graph.on("click", (d: any, i: number, n: any[]) => {
      const { collapsedArray } = this.state;
      let index;
      if ((index = collapsedArray.indexOf(d.id)) > -1) {
        collapsedArray.splice(index, 1);
      } else {
        collapsedArray.push(d.id);
      }
      this.setState((state) => {
        return {collapsedArray_changed: state.collapsedArray_changed + 1}
      });
    });

    graph.on("contextmenu", (d: any, i: number, n: any[]) => {
      d3.event.preventDefault();
      this.setState({ selectedGraph: d, showGraphModal: true });
    });



  }

  public addArrowMarker(svg: any) {
    const arrow = svg
      .append("marker")
      .attr("id", "ArrowMarker")
      .attr("markerUnits", "strokeWidth")
      .attr("markerWidth", "14")
      .attr("markerHeight", "14")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", "40")
      .attr("refY", "0")
      .attr("orient", "auto");
    const arrowPath = "M0,-4 L10,0 L0,4";

    arrow.append("path").attr("d", arrowPath).attr("fill", "#A5ABB6");
  }

  public graphShouldHide(d: any) {
    const {collapsedArray} = this.state;
    if(collapsedArray.indexOf(d.id) > -1) {
      return true;
    }
    return false;
  }

  public linkShouldHide(d: any) {
    const {collapsedArray} = this.state;
    if(collapsedArray.indexOf(d.target) > -1) {
      return true;
    }
    return false;
  }

  public updateSimulation() {
    const { links, graphs } = this.state;
    links.splice(0, links.length);
    graphs.splice(0, graphs.length);
    const graphsEl = d3.select(".graphs");
    console.log(graphsEl);
    
    const linksEl = d3.select(".links");
    console.log(linksEl);
    
    // Update graph
    let graph = graphsEl.selectAll(".graph").data(graphs, (d: any) => this.graphShouldHide(d) ? d : null);
    graph.exit().remove();
    console.log(graph);
    
    const graphEnter = this.createGraph(graph);
    console.log(graphEnter);
    
    graph = graphEnter.merge(graph);
    console.log(graph);
    

    // Update link
    let link = linksEl.selectAll(".link").data(links, (d: any) => this.linkShouldHide(d) ? d : null);
    link.exit().remove();
    console.log(link);
    
    const linkEnter = this.createLink(link);
    console.log(linkEnter);
    
    link = linkEnter.merge(link);
    console.log(link);
    
    this.simulation.nodes(graphs).on("tick", () => this.handleTick(link, graph));
    console.log(link, graph);
    
    this.simulation.force("link").links(links);
    
    this.simulation.alpha(1).restart();
    
  }

  // Add new link
  public showAddLink() {
    this.setState({ showAddLinkModal: true });
  }


  public showAddGraph() {
    this.setState({ showAddGraphModal: true });
  }

  // Add graph
  public async handleAddGraphOk(graph: Graph) {
    const { graphs } = this.state;

    try {
      this.setState({ addGraphLoading: true });
      const { data } = await ApiService.postGraph(graph);

      this.setState(
        {
          graphs: graphs.concat([data]),
          addGraphLoading: false,
        },
        () => this.updateSimulation()
      );
      this.handleAddGraphCancel(false);
      message.success("Add Graph Success");
    } catch (err) {
      this.setState({ addGraphLoading: false });
      // message.error(err.message);
    }
  }

  public handleAddGraphCancel(visible: boolean) {
    this.setState({ showAddGraphModal: visible });
  }

  // Update graphs list
  public async handleGraphOk(graph: Graph) {
    const { selectedGraph } = this.state;

    try {
      this.setState({ editGraphLoading: true });
      await ApiService.patchGraph(selectedGraph.id, graph);

      const graphs = this.state.graphs.map((item) => {
        if (item.id === selectedGraph.id) {
          return {
            ...selectedGraph,
            ...graph,
          };
        }
        return item;
      });

      this.setState(
        {
          graphs,
          selectedGraph: {
            ...selectedGraph,
            ...graph,
          },
          editGraphLoading: false,
        },
        () => this.updateSimulation()
      );
      this.handleGraphCancel(false);

      message.success("Update Graph Success");
    } catch (err) {
      this.setState({ editGraphLoading: false });
      // message.error(err.message);
    }
  }

  public handleGraphCancel(visible: boolean) {
    this.setState({ showGraphModal: visible });
  }


  public async removeGraph(graph: any) {
    const { graphs, links } = this.state;

    try {
      const removedGraphs = graphs.filter((d) => d.id === graph.id);
      const removedLinks = links.filter((d) => d.source.id === graph.id || d.target.id === graph.id);

      await Promise.all(removedGraphs.map(async (d: any) => await ApiService.deleteGraph(d.id)));
      // await Promise.all(removedLinks.map(async (d: any) => await ApiService.deleteLink(d.id)));

      this.setState(
        {
          graphs: graphs.filter((d) => d.id !== graph.id),
          links: links.filter((d) => d.source.id !== graph.id && d.target.id !== graph.id),
        },
        () => this.updateSimulation()
      );
      message.success("Remove Graph Success");
    } catch (err) {
      //message.error(err.message);
    }
  }

  public render() {
    const {
    } = this.state;

    if (this.state.loading) {
      return <Loading />;
    }

    return (
      <Content className="visual-editor">
        <div
          id="Neo4jContainer"
          className="visual-editor-container"
          onClick={(e: SyntheticEvent) => this.restartSimulation(e)}
        />
      </Content>
    );
  }
}

// tslint:disable-next-line: max-file-line-count
export default VisualEditor;

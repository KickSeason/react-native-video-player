import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator, 
  Image, 
  ImageBackground, 
  Platform, 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  ViewPropTypes,
  Text, 
  StatusBar,
  ToastAndroid,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video'; // eslint-disable-line
import SystemSetting from 'react-native-system-setting';

const BackgroundImage = ImageBackground || Image; // fall back to Image if RN < 0.46
const YsIcon = {
  play: require('./icon/play.png'),
  back: require('./icon/back.png'),
  knob: require('./icon/knob.png'),
  more: require('./icon/more.png'),
  next: require('./icon/next.png'),
  pause: require('./icon/pause.png'),
  playCircle: require('./icon/play-circle.png'),
}
const styles = StyleSheet.create({
  preloadingPlaceholder: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playArrow: {
    color: 'white',
  },
  video: Platform.Version >= 24 ? {} : {
    backgroundColor: 'black',
  },
  controls: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    height: 48,
    marginTop: -48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  playControl: {
    color: 'white',
    padding: 8,
  },
  extraControl: {
    color: 'white',
    padding: 8,
  },
  seekBar: {
    alignItems: 'center',
    height: 30,
    flexGrow: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginLeft: -10,
    marginRight: 0,
  },
  seekBarFullWidth: {
    marginLeft: 0,
    marginRight: 0,
    paddingHorizontal: 0,
    marginTop: -3,
    height: 3,
  },
  seekBarProgress: {
    height: 3,
    backgroundColor: '#F00',
  },
  seekBarKnob: {
    // width: 20,
    // height: 20,
    // marginHorizontal: -8,
    // marginVertical: -10,
    // borderRadius: 10,
    // backgroundColor: '#F00',
    //transform: [{ scale: 0.8 }],
    zIndex: 2,
  },
  seekBarBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    height: 3,
  },
  overlayButton: {
    flex: 1,
  },
  timeSyle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
  },

  volReflect: {
    backgroundColor: 'rgba(255, 0, 0, 0.5)',  
    width: 100,
    height: 30,
    flexGrow: 1,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  volProgress: {
    height: 3,
    backgroundColor: '#FFF',
    alignSelf:'flex-end',    
  },
  volLeft: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    height: 3,   
    alignSelf:'flex-end',
  },
});

export default class VideoPlayer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isStarted: props.autoplay,
      isPlaying: props.autoplay,
      isLoading: false,
      width: 200,
      progress: 0,
      isMuted: this.props.muted ? this.props.muted : false,
      isControlsVisible: !props.hideControlsOnStart,
      duration: 0,
      isSeeking: false,
      volume: 0,
      volBarNeedShow: false,
    };

    this.volControlBarWith = 200;
    this.volControlTouchStart = 0;
    this.seekBarWidth = 200;
    this.wasPlayingBeforeSeek = props.autoplay;
    this.seekTouchStart = 0;
    this.seekProgressStart = 0;

    this.onLayout = this.onLayout.bind(this);
    this.onStartPress = this.onStartPress.bind(this);
    this.onProgress = this.onProgress.bind(this);
    this.onEnd = this.onEnd.bind(this);
    this.onLoad = this.onLoad.bind(this);
    this.onPlayPress = this.onPlayPress.bind(this);
    this.onMutePress = this.onMutePress.bind(this);
    this.showControls = this.showControls.bind(this);
    this.onToggleFullScreen = this.onToggleFullScreen.bind(this);
    this.onSeekBarLayout = this.onSeekBarLayout.bind(this);
    this.onSeekGrant = this.onSeekGrant.bind(this);
    this.onSeekRelease = this.onSeekRelease.bind(this);
    this.onSeek = this.onSeek.bind(this);
    this.onVolCtrlGrant = this.onVolCtrlGrant.bind(this);
    this.onVolCtrlRelease = this.onVolCtrlRelease.bind(this);
    this.onVolControl = this.onVolControl.bind(this);
    this.onBack = this.props.onBack;
  }
  componentWillMount() {
    SystemSetting.getVolume().then((volume)=>{
      this.setState({volume});
    });
    const volumeListener = SystemSetting.addVolumeListener(data => {
      this.setState({volume: data.value});
    });
    this.setState({volumeListener});
  }
  componentDidMount() {
    if (this.props.autoplay) {
      this.hideControls();
    }
  }

  componentWillUnmount() {
    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
      this.controlsTimeout = null;
    }
    SystemSetting.removeVolumeListener(this.state.volumeListener);
  }

  onLayout(event) {
    const { width, height } = event.nativeEvent.layout;
    this.setState({
      width,
    });
  }
  onSettingBtn = () => {
    if (this.props.onSettingBtn) {
      this.props.onSettingBtn('setting');
    }
    this.setState({isControlsVisible: false});
  }
  onRightBottomBtn = () => {
    if (this.props.onRightBottomBtn) {
      this.props.onRightBottomBtn('list');
    }
    this.setState({isControlsVisible: false});
  }
  start() {
    console.log('video player start');
    if (this.props.onStart) {
      this.props.onStart();
    }

    this.setState(state => ({
      isPlaying: true,
      isStarted: true,
      progress: state.progress === 1 ? 0 : state.progress,
    }));

    this.hideControls();
  }
  resume() {
    if (this.props.onResume) {
      this.props.onResume();
    }

    this.setState({
      isPlaying: true,
    });
    this.showControls();
  }
  pause() {
    if (this.props.onPause) {
      this.props.onPause();
    }

    this.setState({
      isPlaying: false,
    });
    this.showControls();
  }
  onStartPress() {
    if (this.props.onStart) {
      this.props.onStart();
    }

    this.setState(state => ({
      isPlaying: true,
      isStarted: true,
      progress: state.progress === 1 ? 0 : state.progress,
    }));

    this.hideControls();
  }

  onProgress(event) {
    if (this.state.isSeeking) {
      return;
    }
    if (this.props.onProgress) {
      this.props.onProgress(event);
    }
    this.setState({
      progress: event.currentTime / (this.props.duration || this.state.duration),
      currentTime: event.currentTime,
    });
  }

  onEnd(event) {
    if (this.props.onEnd) {
      this.props.onEnd(event);
    }

    if (this.props.endWithThumbnail) {
      this.setState({ isStarted: false });
      this.player.dismissFullscreenPlayer();
    }

    this.setState({ progress: 1 });

    if (!this.props.loop) {
      this.setState(
        { isPlaying: false },
        () => this.player.seek(0)
      );
    } else {
      this.player.seek(0);
    }
  }

  onLoad(event) {
    if (this.props.onLoad) {
      this.props.onLoad(event);
    }

    const { duration } = event;
    this.setState({ duration, isLoading: false });
  }

  onPlayPress() {
    if (this.props.onPlayPress) {
      this.props.onPlayPress();
    }

    this.setState({
      isPlaying: !this.state.isPlaying,
    });
    this.showControls();
  }

  onMutePress() {
    this.setState({
      isMuted: !this.state.isMuted,
    });
    this.showControls();
  }

  onToggleFullScreen() {
    this.player.presentFullscreenPlayer();
  }

  onSeekBarLayout({ nativeEvent }) {
    const customStyle = this.props.customStyles.seekBar;
    let padding = 0;
    if (customStyle && customStyle.paddingHorizontal) {
      padding = customStyle.paddingHorizontal * 2;
    } else if (customStyle) {
      padding = customStyle.paddingLeft || 0;
      padding += customStyle.paddingRight ? customStyle.paddingRight : 0;
    } else {
      padding = 20;
    }
    this.setState({seekBarViewWidth: nativeEvent.layout.width});
    this.seekBarWidth = nativeEvent.layout.width - padding;
  }

  onSeekStartResponder() {
    return true;
  }

  onSeekMoveResponder() {
    return true;
  }

  onVolCtrlStartResponder() {
    return true;
  }            

  onMoveShouldSetPanResponder() {
    return true;
  }

  onSeekGrant(e) {
    this.seekTouchStart = e.nativeEvent.pageX;
    this.seekProgressStart = this.state.progress;
    this.wasPlayingBeforeSeek = this.state.isPlaying;
    this.setState({
      isSeeking: true,
      isPlaying: false,
    });
  }

  onSeekRelease() {
    this.setState({
      isSeeking: false,
      isPlaying: this.wasPlayingBeforeSeek,
    });
    this.showControls();
  }

  onVolCtrlGrant(e) {
    this.volControlTouchStart = e.nativeEvent.pageY;
    this.showControls();
  }

  onVolCtrlRelease() {
    const volBarNeedShow = false;
    this.setState({volBarNeedShow});
  }

  onVolControl(e) {
    let volume = this.state.volume;
    const senseFactor = 5/4;
    const diff = this.volControlTouchStart - e.nativeEvent.pageY;
    const volChange = diff / (this.getSizeStyles().height) * senseFactor;
    if (1 < diff || diff < -1) {
      this.setState({volBarNeedShow: true, isControlsVisible: true});
    }
    volume = volume + volChange;   
    if(volume > 1) {
      volume = 1;
    }
    if(volume < 0) {
      volume = 0;
    }
    this.volControlTouchStart = e.nativeEvent.pageY;
    let mutedChg = ((volume == 0 && this.state.volume > 0 && !this.state.isMuted) //|| (volume > 0 && this.state.volume == 0) 
                    || (this.state.isMuted && volChange > 0));
    const isMuted = (mutedChg ? (!this.state.isMuted) : (this.state.isMuted));
    this.setState({
      volume,
      isMuted,
    });
    if　(this.props.onVolumeChange) {
      this.props.onVolumeChange(volume);
    }
    SystemSetting.setVolume(volume);
    console.log('volcontrol:', volume, 'mutedChg', mutedChg);
  }

  onSeek(e) {
    const diff = e.nativeEvent.pageX - this.seekTouchStart;
    const ratio = 100 / this.seekBarWidth;
    const progress = this.seekProgressStart + ((ratio * diff) / 100);

    this.setState({
      progress,
    });

    this.player.seek(progress * this.state.duration);
  }

  getSizeStyles() {
    const { videoWidth, videoHeight } = this.props;
    const { width } = this.state;
    const ratio = videoHeight / videoWidth;
    return {
      height: width * ratio,
      width,
    };
  }

  hideControls() {
    if (this.props.onHideControls) {
      this.props.onHideControls();
    }

    if (this.props.disableControlsAutoHide) {
      return;
    }

    if (this.controlsTimeout) {
      clearTimeout(this.controlsTimeout);
      this.controlsTimeout = null;
    }
    this.controlsTimeout = setTimeout(() => {
      this.setState({ isControlsVisible: false });
    }, this.props.controlsTimeout);
  }

  showControls() {
    if (this.state.isControlsVisible) {
      this.setState({
        isControlsVisible: false,
      });
      return;
    }
    if (this.props.onShowControls) {
      this.props.onShowControls();
    }

    this.setState({
      isControlsVisible: true,
    });
    this.hideControls();
  }

  seek(t) {
    this.player.seek(t);
  }

  stop() {
    this.setState({
      isPlaying: false,
      progress: 0,
    });
    this.seek(0);
    this.showControls();
  }

  pause() {
    this.setState({
      isPlaying: false,
    });
    this.showControls();
  }

  resume() {
    this.setState({
      isPlaying: true,
    });
    this.showControls();
  }

  formatTime(seconds) {
    let hour = parseInt(seconds/3600);
    let minute = parseInt(seconds/60);
    let sec = parseInt(seconds%60);
    let formatTime = 0;
    if(hour > 99) {
      return formatTime;
    }
    if(seconds === 0) {
      return '00:00';
    }
    if(hour < 10 && hour > 0) {
      hour = '0' + hour.toString();
    }
    if(minute < 10) {
      minute = '0' + minute.toString();
    }
    if(sec < 10) {
      sec = '0' + sec.toString();
    }
    if(hour > 0) {
      formatTime = hour + ':' + minute + ':' + sec;
    }
    else {
      formatTime = minute + ':' + sec;
    }
    return formatTime;
  }

  getMuteStatus() {
    this.state.isMuted = (this.state.volume === 0 ? true : false);
    return this.props.muted || this.state.isMuted;
  }

  renderStartButton() {
    const { customStyles } = this.props;
    return (
      <TouchableOpacity
        style={[styles.playButton, customStyles.playButton]}
        onPress={this.onStartPress}
      >
        <Image style={[styles.playArrow, customStyles.playArrow]} source={YsIcon.playCircle} size={42} />
      </TouchableOpacity>
    );
  }

  renderThumbnail() {
    const { thumbnail, style, customStyles, ...props } = this.props;
    return (
      <BackgroundImage
        {...props}
        style={[
          styles.thumbnail,
          this.getSizeStyles(),
          style,
          customStyles.thumbnail,
        ]}
        source={thumbnail}
      >
        {this.renderStartButton()}
      </BackgroundImage>
    );
  }

  renderVolControlBar() {
    return (
      <View style={{
              backgroundColor: 'rgba(255, 0, 0, 0)',
              alignSelf: 'flex-end',
              height:this.getSizeStyles().height,
              width:100, 
              marginTop:-this.getSizeStyles().height,
              }}  
            hitSlop={{ top: 20, bottom: 20, left: 10, right: 20 }}
            onStartShouldSetResponder={this.onVolCtrlStartResponder}
            onMoveShouldSetPanResponder={this.onVolCtrlMoveResponder}
            onResponderGrant={this.onVolCtrlGrant}
            onResponderMove={this.onVolControl}
            onResponderRelease={this.onVolCtrlRelease}
            onResponderTerminate={this.onVolCtrlRelease}            
      />     
    );
  }

  renderSeekBar(fullWidth) {
    const { customStyles, disableSeek } = this.props;
    let blockData = this.props.blocks;
    let blockView = [];
    if (blockData
        && Array.isArray(blockData)
        && blockData.length > 0) {
      blockData.forEach((element, index) => {
        if ((this.props.duration || this.state.duration) < element.start) {
            return;
        }
        if ((this.props.duration || this.state.duration) < element.duration) {
          element.duration = (this.props.duration || this.state.duration);
        }
        blockView.push(<View 
          key={index}
          style={{
            zIndex: 1,
            backgroundColor: '#FFFFFFFF',
            position:'absolute', 
            left: element.start * this.state.seekBarViewWidth / (this.props.duration || this.state.duration), 
            height: 4,
            borderRadius: 2,
            width: element.duration * this.state.seekBarViewWidth / (this.props.duration || this.state.duration),
          }} 
        />);
      });
    }
    return (
      <View
        style={[
          styles.seekBar,
          fullWidth ? styles.seekBarFullWidth : {},
          customStyles.seekBar,
          fullWidth ? customStyles.seekBarFullWidth : {},
        ]}
        onLayout={this.onSeekBarLayout}
      >
        <View
          style={[
            { flexGrow: this.state.progress },
            styles.seekBarProgress,
            customStyles.seekBarProgress,
          ]}
        />
        { !fullWidth && !disableSeek ? (
          <Image
            style={[
              styles.seekBarKnob,
              customStyles.seekBarKnob,
              this.state.isSeeking ? { transform: [{ scale: 1.2 }] } : {},
              this.state.isSeeking ? customStyles.seekBarKnobSeeking : {},
            ]}
            hitSlop={{ top: 20, bottom: 20, left: 10, right: 20 }}
            source={YsIcon.knob}
            onStartShouldSetResponder={this.onSeekStartResponder}
            onMoveShouldSetPanResponder={this.onSeekMoveResponder}
            onResponderGrant={this.onSeekGrant}
            onResponderMove={this.onSeek}
            onResponderRelease={this.onSeekRelease}
            onResponderTerminate={this.onSeekRelease}
          />
        ) : null }
        <View style={[
          styles.seekBarBackground,
          { flexGrow: 1 - this.state.progress },
          customStyles.seekBarBackground,
        ]} />
        {
          this.props.showBlocks ? blockView.map((element, index) => {
            return element;
          }) : null
        }
      </View>
    );
  }

  renderVolReflect() {
    return (
      <View
        style={{
          backgroundColor: 'rgba(255, 0, 0, 0)',  
          width:this.getSizeStyles().width/3,
          height:60,
          alignSelf: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          marginBottom: this.getSizeStyles().height*11/25,
        }}
      >
        <Icon
          style={{
            color: 'white',
            alignSelf: 'center',
            marginBottom: 10,
          }}
          name={this.state.isMuted ? 'volume-off' : 'volume-up'}
          size={30}
        />    
        <View 
          style={{
            backgroundColor: '#F00',
            flexDirection: 'row',
          }}
        > 
          <View 
            style={[
            {    
              height: 3,
              backgroundColor: '#FFF',
            },            
            {flexGrow: this.state.volume},
            ]}
          />
          <View
            style={[
              {
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                height: 3,   
              },
              {flexGrow: 1 - this.state.volume},
            ]}
          />
        </View>
      </View>
    );
  }

  renderControls() {
    const { customStyles } = this.props;
    return (
      <View style={[styles.controls, customStyles.controls]}>
        <TouchableOpacity
          onPress={this.onPlayPress}
          style={[customStyles.controlButton, customStyles.playControl, {padding: 10}]}
        >
          <Image
            source={this.state.isPlaying ? YsIcon.pause : YsIcon.play}
            size={32}
          />
        </TouchableOpacity>
        {this.renderSeekBar()}
        {
          <Text style={styles.timeSyle}>
            {this.formatTime(this.state.currentTime)}/{this.formatTime(this.state.duration)}
          </Text>
        }
        {/* {this.props.muted ? null : (
          <TouchableOpacity onPress={this.onMutePress} style={customStyles.controlButton}>
            <Icon
              style={[styles.extraControl, customStyles.controlIcon]}
              name={this.state.isMuted ? 'volume-off' : 'volume-up'}
              size={24}
            />
          </TouchableOpacity>
        )} */}
        {(Platform.OS === 'android' || this.props.disableFullscreen) ? null : (
          <TouchableOpacity onPress={this.onToggleFullScreen} style={customStyles.controlButton}>
            <Icon
              style={[styles.extraControl, customStyles.controlIcon]}
              name="fullscreen"
              size={32}
            />
          </TouchableOpacity>
        )}
        {
          <TouchableOpacity onPress={this.onRightBottomBtn} style={customStyles.controlButton}>
            <Text style={{color: 'white', fontSize: 15, paddingLeft: 10, paddingRight: 10}}>推荐</Text>
          </TouchableOpacity>
        }
      </View>
    );
  }

  renderVideo() {
    const {
      video,
      style,
      resizeMode,
      pauseOnPress,
      fullScreenOnLongPress,
      customStyles,
      ...props
    } = this.props;
    return (
      <View style={customStyles.videoWrapper}>
        <Video
          {...props}
          style={[
            styles.video,
            this.getSizeStyles(),
            style,
            customStyles.video,
          ]}
          ref={p => { this.player = p; }}
          volume={this.state.volume}          
          muted={this.props.muted || this.state.isMuted}
          paused={!this.state.isPlaying}
          onProgress={this.onProgress}
          onEnd={this.onEnd}
          onLoad={this.onLoad}
          source={video}
          resizeMode={resizeMode}
        />
        <View
          style={[
            this.getSizeStyles(),
            { marginTop: -this.getSizeStyles().height },
          ]}
        >
          <TouchableOpacity
            style={styles.overlayButton}
            onPress={() => {
              this.showControls();
              if (pauseOnPress)
                this.onPlayPress();
            }}
            onLongPress={() => {
              if (fullScreenOnLongPress && Platform.OS !== 'android')
                this.onToggleFullScreen();
            }}
          /> 
          {this.state.volBarNeedShow
            ? this.renderVolReflect() : null}                                
        </View>     
        {((!this.state.isPlaying) || this.state.isControlsVisible)
          ? this.renderControls() : this.renderSeekBar(true)}
        {this.renderVolControlBar()}
      </View>
    );
  }

  renderContent() {
    const { thumbnail, style } = this.props;
    const { isStarted } = this.state;

    if (!isStarted && thumbnail) {
      return this.renderThumbnail();
    } else if (!isStarted ) {
      return (
        <View style={[styles.preloadingPlaceholder, this.getSizeStyles(), style]}>
          {this.renderStartButton()}
        </View>
      );
    } else if (!this.props.video.uri) {
      return (
        <View style={[styles.preloadingPlaceholder, this.getSizeStyles(), style]}>
        <ActivityIndicator color='white' size='large' />
        </View>
      );
    }
    return this.renderVideo();
  }

  renderHeader() {
    const {height} = this.getSizeStyles();
    const {videoTitle} = this.props;
    return (
      <View>
        <StatusBar
          backgroundColor='rgba(0, 0, 0, 0.6)'
          translucent={true}
          hidden={this.state.isPlaying && !this.state.isControlsVisible} 
        />
      <View style={{marginTop: -height + StatusBar.currentHeight, marginBottom: height, flexDirection: 'row', justifyContent: 'center', zIndex: 2, backgroundColor: 'rgba(0, 0, 0, 0.6)'}}>
        <TouchableOpacity 
          style={{flex: 1,paddingLeft: 10, justifyContent: 'center'}}
          onPress={this.onBack}
        >
          <Image source={YsIcon.back} size={25} />
        </TouchableOpacity>
        <View 
          style={{flex: 8, alignItems: 'flex-start'}}
        >
          <Text 
            style={{color: 'white', backgroundColor: 'transparent', fontSize: 18}}
            numberOfLines={1}//only show one line 
            allowFontScaling={true}
          >
            {videoTitle}
          </Text>
        </View>
        <View style={{flex: 1}}>
        <TouchableOpacity 
            style={{flex: 1, paddingLeft: 10, justifyContent: 'center'}}
            onPress={this.onSettingBtn}
          >
            <Image source={YsIcon.more} size={25} />
        </TouchableOpacity>
        </View>
      </View>
      </View>
    );
  }

  render() {
    return (
      <View onLayout={this.onLayout} style={this.props.customStyles.wrapper}>
        {this.renderContent()}
        {(!this.state.isPlaying || this.state.isControlsVisible) ? this.renderHeader(): null}
        {this.props.showBlocks ? (this.props.tagViews.map((element, index) => {
            return element;
            })) : null}
      </View>
    );
  }
}

VideoPlayer.propTypes = {
  video: Video.propTypes.source,
  thumbnail: Image.propTypes.source,
  videoWidth: PropTypes.number,
  videoHeight: PropTypes.number,
  duration: PropTypes.number,
  autoplay: PropTypes.bool,
  defaultMuted: PropTypes.bool,
  muted: PropTypes.bool,
  style: ViewPropTypes.style,
  controlsTimeout: PropTypes.number,
  disableControlsAutoHide: PropTypes.bool,
  disableFullscreen: PropTypes.bool,
  loop: PropTypes.bool,
  resizeMode: Video.propTypes.resizeMode,
  hideControlsOnStart: PropTypes.bool,
  endWithThumbnail: PropTypes.bool,
  disableSeek: PropTypes.bool,
  pauseOnPress: PropTypes.bool,
  fullScreenOnLongPress: PropTypes.bool,
  videoTitle: PropTypes.string,
  customStyles: PropTypes.shape({
    wrapper: ViewPropTypes.style,
    video: Video.propTypes.style,
    videoWrapper: ViewPropTypes.style,
    controls: ViewPropTypes.style,
    playControl: TouchableOpacity.propTypes.style,
    controlButton: TouchableOpacity.propTypes.style,
    controlIcon: Icon.propTypes.style,
    playIcon: Icon.propTypes.style,
    seekBar: ViewPropTypes.style,
    seekBarFullWidth: ViewPropTypes.style,
    seekBarProgress: ViewPropTypes.style,
    seekBarKnob: ViewPropTypes.style,
    seekBarKnobSeeking: ViewPropTypes.style,
    seekBarBackground: ViewPropTypes.style,
    thumbnail: Image.propTypes.style,
    playButton: TouchableOpacity.propTypes.style,
    playArrow: Icon.propTypes.style,
  }),
  onEnd: PropTypes.func,
  onProgress: PropTypes.func,
  onLoad: PropTypes.func,
  onStart: PropTypes.func,
  onPlayPress: PropTypes.func,
  onHideControls: PropTypes.func,
  onShowControls: PropTypes.func,
  onBack: PropTypes.func,
};

VideoPlayer.defaultProps = {
  videoWidth: 1280,
  videoHeight: 720,
  autoplay: false,
  controlsTimeout: 2000,
  loop: false,
  resizeMode: 'contain',
  disableSeek: false,
  pauseOnPress: false,
  fullScreenOnLongPress: true,
  customStyles: {},
};

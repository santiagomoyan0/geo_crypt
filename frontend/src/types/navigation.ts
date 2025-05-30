import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { File } from './file';

export type RootStackParamList = {
    Login: undefined;
    Register: undefined;
    FileList: undefined;
    FileDetails: { file: File };
    Upload: undefined;
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type FileDetailsRouteProp = RouteProp<RootStackParamList, 'FileDetails'>; 
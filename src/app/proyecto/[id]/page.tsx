'use client'
import Image from "next/image";
import React, { useState, useEffect, useRef } from "react";
import { Avatar, Divider, Tooltip, Select, SelectItem, Progress, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, CircularProgress } from "@nextui-org/react";
import { sendMessageToBot } from "@/pages/api/bot";
import { useRouter, usePathname } from "next/navigation";
import CheckSession from '@/lib/checkSession'
import supabaseClient from '@/lib/supabase'
import '@/styles/chat.css'

import arrowR from '@/public/icons/arrow-right.svg'
import link from '@/public/icons/link.svg';
import wand from '@/public/icons/wand.svg';
import wWand from '@/public/icons/white-wand.svg';
import forward from '@/public/icons/forward.svg';
import fileIcon from '@/public/icons/file.svg';
import deleteIcon from '@/public/icons/delete.svg'
import trashIcon from '@/public/icons/trash.svg'
import maximizeIcon from '@/public/icons/maximize.svg'


type Message = {
    sender: string;
    content: string;
    timestamp: string;
    avatar: string;
    data: string;
};

type SourceDataItem = {
    pageContent: string;
    metadata: {
        loc: {
            lines: {
                from: number;
                to: number;
            };
        };
    };
};

type UrlType = {
    publicUrl: string
}

type ChatModuleProps = {
    hover: boolean;
    setHover: React.Dispatch<React.SetStateAction<boolean>>;
    handleSendClick: (value: string) => void;
    inputValue: string;
    handleMessageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

interface BotResponse {
    question: string;
    users: { [key: string]: string; };
    answer: string;
}

interface Project {
    name: string;
    description: string;
    files: Array<{ name: any, size: any, url: string }>;
    removedFiles: Array<{ name: any }>
}

interface FileWithId extends File {
    id: number;
    url: string;
    name: string;
}

const ChatModule: React.FC<ChatModuleProps> = ({ hover, setHover, handleSendClick, inputValue, handleMessageChange }) => {

    return (
        <div className="w-[640px] h-auto rounded-lg bg-white p-3 flex justify-between border-x-1 border-t-1 border-b-2 border-[#E0E0E0]">
            <div className="w-4/5 h-full max-h-5 flex flex-row gap-2">
                <Image src={wand} alt="wand" width={20} height={20} />
                <input type="text" value={inputValue} placeholder="Haz una consulta..." onChange={handleMessageChange} className="bg-white w-full border-white focus:outline-none text-md font-medium text-[#8A90A7] placeholder:text-[#8A90A7]" />
            </div>
            <div className="w-auto h-full max-h-5 flex flex-row gap-1 items-center cursor-pointer ease-in-out duration-200" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={() => handleSendClick(inputValue)}>
                <Image src={forward} alt="wand" width={20} height={20} className={hover ? "fill-current text-[#F29545] filter brightness-0 saturate-100% hue-rotate(360deg) invert(46%) sepia(86%) saturate(1146%) hue-rotate(356deg) brightness(101%) contrast(87%) duration-200" : "duration-200 fill-current"} />
                <span className={hover ? "font-semibold text-sm text-black duration-200" : "font-semibold text-sm text-[#8A90A7] duration-200"}>Enviar</span>
            </div>
        </div>
    );
};

export default function Chat() {
    const router = useRouter();
    const pathname = usePathname();
    const [hover, setHover] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [timestamps, setTimestamps] = useState<{ sender: string; content: string; timestamp: string; }[]>([]);
    const [data, setData] = useState("");
    const [message, setMessage] = useState("");
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isTableFinished, setTableFinished] = useState(false);
    const [tooltipContent, setTooltipContent] = useState('Copiar URL');
    const [projects, setProjects] = useState<Project[]>([])
    const [filesOpen, setFilesOpen] = useState(false)
    const [files, setFiles] = useState<FileWithId[]>([]);
    const [loadingFileIndex, setLoadingFileIndex] = useState<number | null>(null);
    const [completedFiles, setCompletedFiles] = useState<number[]>([]);
    const [progress, setProgress] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadModalVisible, setLoadModalVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadMessage, setLoadMessage] = useState('Cargando archivos...');

    const handleStartClick = () => {
        setLoadModalVisible(true);
        setIsLoading(true);
    
        const fileNames = projects[0]?.files?.flat().map(file => file.name);
    
        if (fileNames && fileNames.length > 0) {
            let i = 0;
            const displayNextFileName = () => {
                setLoadMessage(`Cargando archivo: ${fileNames[i]}`);
                i++;
                if (i < fileNames.length) {
                    setTimeout(displayNextFileName, 5000); 
                } else {
                    setIsLoading(false);
                    setLoadMessage('Error, no hay preguntas para el bot... intenta nuevamente');
                    setTableFinished(true)
                }
            };
            displayNextFileName();
        } else {
            setTimeout(() => {
                setIsLoading(false);
            }, 10000);const handleStartClick = () => {
                setLoadModalVisible(true);
                setIsLoading(true);
            
                const fileNames = projects[0]?.files?.flat().map(file => file.name);
            
                if (fileNames && fileNames.length > 0) {
                    let i = 0;
                    const displayNextFileName = () => {
                        setLoadMessage(`Cargando archivo: ${fileNames[i]}`);
                        i++;
                        if (i < fileNames.length) {
                            setTimeout(displayNextFileName, 2000);
                        } else {
                            setIsLoading(false);
                        }
                    };
                    displayNextFileName();
                } else {
                    setTimeout(() => {
                        setIsLoading(false);
                        setLoadMessage('Fallido, no hay preguntas para el bot');
                    }, 10000);
                }
            };
        }
    };

    const handleMessageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };

    const handleSendClick = async (value: string) => {
        setInputValue(value);
        setMessage(value);
        setIsModalVisible(true);
        await handleSendMessage();
    };

    const handleSendMessage = async () => {
        setInputValue('')
        const newMessage: Message = {
            sender: "user",
            content: inputValue,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            avatar: '',
            data: data
        };

        const updatedMessages: Message[] = [...messages, newMessage];
        setMessages(updatedMessages);

        setMessages(updatedMessages);
        setMessage("");
        setTimestamps([...timestamps, newMessage]);

        const botResponses = await sendMessageToBot([inputValue]);
        console.log(botResponses[0]);
        // console.log(botResponse)


        const autoResponse: Message = {
            sender: "bot",
            content: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            avatar: '',
            data: data
        };

        setTimeout(() => {
            setMessages([...updatedMessages, autoResponse]);
        }, 1000);
    };

    useEffect(() => {
        if (messagesContainerRef.current) {
            const lastMessage = messagesContainerRef.current.lastElementChild;
            lastMessage?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        setTooltipContent('URL copiado exitosamente');
        setTimeout(() => setTooltipContent('Copiar URL'), 2000);
    }

    useEffect(() => {
        fetchProjects()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchProjects = async () => {
        const projectId = pathname?.split('/')[2];
        const { data, error } = await supabaseClient
            .from('proyectos')
            .select('*')
            .eq('name', projectId);

        if (error) {
            console.error('Error al obtener proyectos:', error)
        } else {
            setProjects(data)
        }
    }

    const updateProjectFiles = async (files: FileWithId[], url: string) => {
        const newFiles = files.map(file => [({ name: file.name, size: parseFloat((file.size / (1024 * 1024)).toFixed(2)), url: url })]);

        console.log(newFiles)
        console.log(projects[0].name)

        setTimeout(async () => {
            const { data, error } = await supabaseClient
                .from('proyectos')
                .update({
                    files: newFiles
                })
                .eq('name', projects[0].name)
                .select()
            console.log(data)
            if (error) {
                console.error('Error al actualizar los archivos del proyecto:', error);
            } else {
                console.log('Archivos del proyecto actualizados con éxito:', data);
                router.refresh();
            }
        }, 4000);
    }

    useEffect(() => {
        const checkUserSession = async () => {
            const session = await CheckSession();
            if (session.session == null) {
                console.log("El usuario no está logueado");
                router.push('/auth')
            }
        };
        checkUserSession();
    }, [router]);

    const handleFilesOpen = () => {
        setFilesOpen(!filesOpen)
    }

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files) as FileWithId[];
            newFiles.forEach(file => file.id = Date.now());

            const newUniqueFiles = newFiles.filter(newFile =>
                !files.some(existingFile => existingFile.name === newFile.name)
            );

            setFiles(oldFiles => [...oldFiles, ...newUniqueFiles]);

            event.target.value = '';
        }
    };

    const handleFileDelete = async (file: string) => {
        console.log(file)

        console.log(projects[0].name)

        try {
            const { data, error } = await supabaseClient
                .storage
                .from(projects[0].name)
                .remove([file])
            console.log(data);
            console.log(error);
        } catch (error) {
            console.log(error);
        }

        if (data !== null) {
            const archivosActualizados = projects[0].files.flat().map(archivo => {
                if (archivo.name !== file) {
                    return archivo;
                }
            }).filter(Boolean);
            console.log(archivosActualizados);
            const { data, error } = await supabaseClient
                .from('proyectos')
                .update({ files: archivosActualizados })
                .eq('name', projects[0].name)
                .select();
            console.log(data);
            if (data) {
                window.location.reload();
            } else {
                console.log('algo fallo')
            }
        }
    };

    const handleFileSave = async () => {
        setIsSaving(true);
        const filesToSave = files.filter(file => !completedFiles.includes(file.id));
        filesToSave.forEach(async (file, index) => {
            setTimeout(async () => {
                setLoadingFileIndex(file.id);
                setProgress(0);
                console.log(`Guardando archivo: ${file.name}`);
                const { data, error } = await supabaseClient.storage.listBuckets()
                if (error) {
                    console.error('Error al listar los buckets:', error)
                } else {
                    const bucketExists = data.some(bucket => bucket.id === projects[0]?.name)

                    if (!bucketExists) {
                        const { data, error } = await supabaseClient.storage.createBucket(projects[0]?.name, {
                            public: true,
                        })

                        if (error) {
                            console.error('Error al crear el bucket:', error)
                        } else {
                            console.log('Bucket creado con éxito:', data)
                        }
                    }
                }


                const filePath = `${file.name}`;
                const { data: uploadData, error: uploadError } = await supabaseClient
                    .storage
                    .from(projects[0]?.name)
                    .upload(filePath, file)
                if (uploadError) {
                    console.error('Hubo un error subiendo el archivo:', uploadError);
                } else {
                    const { data, error } = await supabaseClient
                        .storage
                        .from(projects[0]?.name)
                        .createSignedUrl(uploadData.path, 7889400)
                    console.log(data)
                    const fileUrl = data?.signedUrl || '';
                    console.log('Archivo subido con éxito:', uploadData);

                    if (file.id === filesToSave[filesToSave.length - 1].id) {
                        setIsSaving(false);
                        await updateProjectFiles(filesToSave, fileUrl);
                    }
                }


                const intervalId = setInterval(() => {
                    setProgress(oldProgress => {
                        if (oldProgress >= 100) {
                            clearInterval(intervalId);
                            setCompletedFiles(oldArray => [...oldArray, file.id]);
                            if (file.id === filesToSave[filesToSave.length - 1].id) {
                                setIsSaving(false);
                            }
                            setLoadingFileIndex(null);
                            return 100;
                        }
                        return oldProgress + 10;
                    });
                }, 600);
            }, index * 7000);
        });
    };

    return (

        <div className="w-screen h-auto flex flex-col items-center justify-start px-32">

            <div className="w-screen h-14 bg-white flex flex-row items-center justify-between px-8 py-3">

                <div className="w-auto h-auto max-h-8 flex flex-row px-3 py-2 gap-1 items-center justify-start border-2 border-[#EFF0F3] rounded-lg hover:border-[#F29545] cursor-pointer" onClick={() => router.push('/')}>

                    <Image src={arrowR} alt='arrow' width={16} height={16} className="rotate-180" />

                    <span className='w-fit font-semibold text-[#F29545] text-sm'>Regresar</span>

                </div>

                <div className="w-auto h-auto max-h-8 flex flex-row gap-4 items-center justify-start">

                    <Tooltip content={tooltipContent} className="rounded-md" delay={0} closeDelay={0} showArrow>

                        <div className="w-auto h-auto max-h-8 flex flex-row px-2 py-2 gap-1 items-center justify-start border-2 border-[#EFF0F3] bg-white rounded-lg hover:border-[#F29545] cursor-pointer" onClick={handleCopyLink}>

                            <Image src={link} alt='arrow' width={16} height={16} className="rotate-180" />

                        </div>

                    </Tooltip>

                    <Divider orientation="vertical" className="divider h-[24px] w-[2px] rounded" />

                    <div aria-label="Descripción accesible" className="w-auto h-auto max-h-8 flex flex-row px-3 py-2 gap-1 items-center justify-start rounded-lg bg-[#F29545] cursor-pointer" onClick={handleStartClick}>

                        <span className='w-fit font-semibold text-white text-sm'>Comenzar</span>

                    </div>

                    <Divider orientation="vertical" className="divider h-[24px] w-[2px] rounded" />

                    <div className="trashcontainer border-2 border-[#FF6363] rounded-lg w-auto h-auto max-w-[34px] max-h-[34px] flex p-1 cursor-pointer hover:bg-[#FF6363]">
                        <Image src={trashIcon} alt="" width={24} height={24} className="trash" />
                    </div>

                </div>

            </div>

            <div className="w-full max-w-7xl h-full pt-10 pb-10 flex flex-col items-center justify-start gap-5">

                <ChatModule hover={hover} setHover={setHover} handleSendClick={handleSendClick} inputValue={inputValue} handleMessageChange={handleMessageChange} />

                {isModalVisible && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-start pt-[94px] gap-4">
                        <ChatModule hover={hover} setHover={setHover} handleSendClick={handleSendClick} inputValue={inputValue} handleMessageChange={handleMessageChange} />

                        <div className="messages max-h-6/12 flex flex-col items-center justify-start gap-4 overflow-auto scroll" ref={messagesContainerRef}>
                            {messages.map((message, index) => (
                                <div key={index}>

                                    <div className="w-[640px] h-auto rounded-lg bg-white p-3 flex justify-between border-x-1 border-t-1 border-b-2 border-[#E0E0E0]">

                                        <div className="w-full h-auto flex flex-row gap-2">

                                            {message.sender === 'user' ? (
                                                <Avatar className="min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px]" src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
                                            ) : (
                                                <Avatar radius="sm" className="min-w-[36px] min-h-[36px] max-w-[36px] max-h-[36px] p-2 bg-black" src={wWand} />
                                            )}

                                            <span className='w-full flex flex-row items-center justify-start break-words overflow-wrap break-word font-semibold'>{message.content}</span>

                                        </div>

                                    </div>

                                </div>
                            ))}

                        </div>
                    </div>
                )}

                <div className="w-full h-auto bg-white p-5 flex flex-row justify-between items-center rounded-lg border-x-1 border-t-1 border-b-2 border-[#E0E0E0]">

                    <div className="w-auto h-auto flex flex-col items-start justify-start cursor-default">

                        <h4 className="font-bold text-xl text-[#131315]">{projects[0]?.name}</h4>

                        <span className="font-regular text-base text-[#8A90A7]">{projects[0]?.description}</span>

                    </div>

                    <div className="w-auto h-full flex flex-row gap-5 items-center justify-center">

                        <div className="flex flex-col gap-0 items-start justify-start">

                            <span className="font-bold text-base text-[#F29545] cursor-pointer" onClick={handleFilesOpen}>Archivos</span>

                            <span className="font-normal text-base text-[#8A90A7] cursor-default">Inspeccionar Carpeta</span>

                        </div>

                        <Divider orientation="vertical" className="divider h-[38px] w-[2px] rounded" />

                        <div className="flex flex-col gap-0 items-start justify-start">

                            <span className="font-bold text-base text-[#F29545] cursor-pointer">Preguntas</span>

                            <span className="font-normal text-base text-[#8A90A7] cursor-default">Inspeccionar Carpeta</span>

                        </div>

                    </div>

                    <Modal
                        backdrop="opaque"
                        isOpen={filesOpen}
                        onOpenChange={handleFilesOpen}
                        classNames={{
                            backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20"
                        }}
                        className="w-full h-auto max-w-[464px] max-h-[600px] rounded-lg"
                        isDismissable={false}
                    >

                        <ModalContent className="w-full h-auto">

                            {(onClose) => (
                                <div className="w-full h-full flex flex-col items-center justify-start gap-6 p-6">

                                    <ModalBody className="w-full h-full flex flex-col items-center justify-start gap-6 p-0">

                                        <div className="w-full h-full flex flex-col gap-2 cursor-default">
                                            <span className=" font-bold text-xl text-[#31313A]">Archivos</span>

                                            <div className="archives pr-1 flex flex-col items-start justify-start gap-2 max-h-[192px] overflow-auto">

                                                {projects?.[0]?.files?.flat().map((file) => (
                                                    <div key={file.name} className={`border-2 rounded-md w-full h-auto  flex flex-row px-2 py-1.5 items-center border-[#F29545]`}>
                                                        <div className="w-full flex flex-row items-center justify-start gap-2">
                                                            <Image src={fileIcon} alt="file" width={24} height={24} className="file active" />
                                                            <div className="flex flex-col gap-0 p-0 w-full">
                                                                <span className="text-sm font-semibold" style={{ color: '#F29545' }}>{file.name}</span>
                                                                <span className="text-sm font-normal" style={{ color: '#F29545' }}>{(file.size)} MB</span>
                                                            </div>
                                                            <Image src={deleteIcon} alt="delete file" width={24} height={24} className="delete active cursor-pointer h-6" onClick={() => handleFileDelete(file.name)} />
                                                        </div>
                                                    </div>
                                                ))}

                                            </div>
                                        </div>

                                        <div className="w-full h-full flex flex-col gap-2 cursor-default">
                                            <span className="w-full font-bold text-xl text-[#31313A]"></span>

                                            <div className="pendings pr-1 flex flex-col items-start justify-start gap-2 max-h-[192px] overflow-auto">

                                                {files.filter((file) => !completedFiles.includes(file.id)).map((file) => (
                                                    <div key={file.id} className={`border-2 rounded-md w-full h-auto max-h-[60px] flex flex-row px-2 py-1.5 items-center border-[#8A90A7]`}>
                                                        <div className="w-full flex flex-row items-center justify-start gap-2">
                                                            {loadingFileIndex === file.id ? <CircularProgress aria-label="progress" className="file" size="sm" color="default" /> : <Image src={fileIcon} alt="file" width={24} height={24} className="file" />}
                                                            <div className="flex flex-col gap-0 p-0 w-full h-auto">
                                                                <span className="text-sm font-semibold" style={{ color: '#8A90A7' }}>{file.name}</span>
                                                                <span className="text-sm font-normal" style={{ color: '#8A90A7' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                                                {loadingFileIndex === file.id && <Progress aria-label="progress" value={progress} className=" max-h-1 bg-[#8A90A7] rounded" />}
                                                            </div>
                                                            {isSaving ? null : <Image src={deleteIcon} alt="delete file" width={24} height={24} className="delete cursor-pointer h-6 " onClick={() => handleFileDelete(file.name)} />}
                                                        </div>
                                                    </div>
                                                ))}

                                                {!isSaving && (

                                                    <div className="border-[#8A90A7] border-dashed border-2 rounded-md w-full h-auto max-h-[54px] flex flex-row items-center justify-center">

                                                        <div className="w-full h-auto max-h-[54px] flex flex-row items-center justify-center">
                                                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-[48px] border-[#8A90A7] rounded-md cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                                                <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Haz click para cargar un <strong>PDF</strong></span></p>
                                                                <input id="dropzone-file" type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf" />
                                                            </label>
                                                        </div>

                                                    </div>

                                                )}
                                            </div>

                                        </div>
                                        <Button isLoading={isSaving} onClick={handleFileSave} className="w-full h-auto flex p-2 text-[#DADCE3] font-semibold text-sm bg-[#31313A] rounded">Guardar Archivos</Button>

                                    </ModalBody>

                                </div>
                            )}

                        </ModalContent>

                    </Modal>

                    <Modal
                        isOpen={isLoadModalVisible}
                        onOpenChange={() => setLoadModalVisible(false)}
                        className="w-full h-auto max-w-[464px] max-h-[600px] rounded-lg"
                        isDismissable={false}
                    >
                        <ModalContent className="w-full h-auto">
                            <ModalBody className="w-full h-full flex flex-col items-center justify-center gap-6 p-6">
                                {isLoading ? <CircularProgress /> : null}
                                <p>{loadMessage}</p>
                            </ModalBody>
                        </ModalContent>
                    </Modal>

                </div>

                {isTableFinished ? (
                    <div className="w-full h-full bg-white flex flex-col gap-5 items-center justify-start rounded-lg border-x-1 border-t-1 border-b-2 border-[#E0E0E0] md:min-w-[300px]">

                        <div className="w-full min-h-[56px] rounded-t-lg border-b-2 border-[#EFF0F3] flex flex-row p-5 items-center justify-between cursor-default">

                            <span className=" text-base font-bold text-[#131315]">Tabla generada automáticamente</span>

                            <Image src={maximizeIcon} width={20} height={20} alt="maximize" className="cursor-pointer" />

                        </div>

                        <div className="w-full h-full px-5 pb-5 gap-5 flex flex-col">

                            <div className="w-full min-h-[32px] max-h-[32px] flex flex-row p-2 items-center justify-between cursor-default ">

                                <span className=" text-base font-bold text-[#F29545]">Tabla Completa</span>

                                <Select aria-label="Selector" className="max-w-xs max-h-8 overflow-hidden flex flex-col items-center justify-center">
                                    <SelectItem key={1} >Empty</SelectItem>
                                </Select>

                            </div>

                            <div className="w-full h-[calc(100%-40px)] box-border border-1 border-[#E0E0E0] rounded-md flex flex-row items-start justify-start">

                                <div className="w-1/3 h-full rounded-s-lg flex flex-col items-start justify-start gap-2 p-2">

                                    {/* <div className="w-full h-auto min-h-[52px] flex flex-col items-start justify-center p-4 gap-2 rounded-md hover:bg-[#FDEBDC] cursor-pointer hover:font-semibold duration-200">

                                        <span>¿Que informacion necesita su trabajo/empresa?</span>

                                    </div> */}

                                </div>

                                <div className="w-2/3 h-full bg-[#EFF0F3] rounded-e-lg flex flex-row gap-2 p-2 items-start justify-start overflow-x-scroll">

                                    <div className="min-w-[256px] max-w-[312px] h-full flex flex-col gap-2">

                                        {/* <div className="w-full min-h-[36px] flex items-center justify-center rounded-md px-3 py-2 bg-white cursor-default">

                                            <span className=" text-base font-medium text-[#131315]">Mateo Aponte</span>

                                        </div> */}

                                        <div className="w-full min-h-[36px] flex items-center justify-center rounded-md px-3 py-2 bg-white cursor-default">

                                            {/* <div className=" overflow-y-scroll w-full h-full max-h-[412px]">

                                                <span className=" text-base font-normal text-[#131315]">De la corte constitucional mas que todo porque estoy mas enfocado hacia el derecho privado, entonces se que las publicaciones tienen todas las ramas del derecho pero me interesa mas la corte institucional De la corte constitucional mas que todo porque estoy mas enfocado hacia el derecho privado, entonces se que las publicaciones tienen todas las ramas del derecho pero me interesa mas la corte institucionalDe la corte constitucional mas que todo porque estoy mas enfocado hacia el derecho privado, entonces se que las publicaciones tienen todas las ramas del derecho pero me interesa mas la corte institucionalDe la corte constitucional mas que todo porque estoy mas enfocado hacia el derecho privado, entonces se que las publicaciones tienen todas las ramas del derecho pero me interesa mas la corte institucional</span>

                                            </div> */}

                                        </div>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                ) : null}

            </div>

        </div>


    );

}
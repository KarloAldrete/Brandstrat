'use client';
import { Divider, Tooltip, Progress, Modal, ModalContent, ModalBody, Button, CircularProgress, Dropdown, DropdownTrigger, DropdownItem, DropdownMenu, ScrollShadow, ModalFooter } from "@nextui-org/react";
import { useRouter, usePathname } from "next/navigation";
import supabaseClient from '@/lib/supabase'
import '@/styles/chat.css'
import { IconArrowNarrowLeft, IconLink, IconColumns, IconFileFilled, IconBackspaceFilled, IconMenu2, IconTrash, IconFiles, IconQuestionMark, IconUsersGroup, IconX, IconSend } from '@tabler/icons-react';
import ModalInteractive from '@/components/interactiveModal';
import { useCallback, useEffect, useRef, useState } from "react";
import { utils, writeFile } from 'xlsx';
import ChatModal from '@/components/chatModal'
import { Toaster, toast } from 'sonner'
import readXlsxFile from 'read-excel-file'


interface Project {
    description: string;
    files: any;
    id: string;
    questions: any;
    status: string;
    type: string;
    users: {
        user: {
            email: string;
            id: string;
            img: string;
            name: string;
            role: string;
        }
    }
}

interface FileWithId extends File {
    id: number;
    url: string;
    name: string;
    title: string;
}

export default function Chat() {
    const router = useRouter();
    const pathname = usePathname();
    const projectId = pathname!.split("/")[2];
    const [project, setProject] = useState<Project | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [table, isTableFinished] = useState(false);
    const [tableReady, setTableReady] = useState(false)
    const [filesOpen, setFilesOpen] = useState(false);
    const [files, setFiles] = useState<FileWithId[]>([]);
    const [completedFiles, setCompletedFiles] = useState<number[]>([]);
    const [loadingFileIndex, setLoadingFileIndex] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newFiles, setNewFiles] = useState<FileWithId[]>([]);
    const [questionsOpen, setQuestionsOpen] = useState(false)
    const [inputValue, setInputValue] = useState('');
    const [questions, setQuestions] = useState<string[]>([]);
    const [tableData, setTableData] = useState<any>([]);
    const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        const { data, error } = await supabaseClient
            .from('proyectos')
            .select('*')
            .eq('id', projectId)
            .single()
        setProject(data);
        setFiles(data?.files);
        setQuestions(data.questions);
        if (data?.tableData && Object.keys(data.tableData).length > 0) {
            setTableData(data.tableData);
            isTableFinished(true);
        }
    }, [projectId]);

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleStart = () => {
        setIsModalOpen(true);
    }

    const handleModalData = (data: any) => {
        setTableData(data);
        isTableFinished(true);
        setTableReady(true);
        handleSaveTable(data);
    }

    const handleSaveTable = async (dataToSave: any) => {
        if (!dataToSave) {
            console.error('No hay datos para guardar');
            return;
        }

        const { data, error } = await supabaseClient
            .from('proyectos')
            .update({ tableData: dataToSave, status: 'process' })
            .eq('id', projectId)
            .single();

        if (error) {
        } else {
        }
    }

    function getTipoAnalisis(type: string | undefined): "grupales" | "profundidad" {
        const lowerCaseType = type?.toLowerCase();
        if (lowerCaseType === "grupales" || lowerCaseType === "profundidad") {
            return lowerCaseType;
        } else {
            return "grupales";
        }
    }

    const handleFiles = (projectId: string) => {
        setFilesOpen(true)
    };

    const toggleFilesOpen = () => {
        setFilesOpen(prevState => !prevState);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFilesToAdd = Array.from(event.target.files) as FileWithId[];
            newFilesToAdd.forEach(file => file.id = Date.now());
            const newUniqueFiles = newFilesToAdd.filter(newFile =>
                !files?.some(existingFile => existingFile.name === newFile.name)
            );
            setNewFiles(oldFiles => {
                const updatedFiles = [...oldFiles, ...newUniqueFiles];
                console.log(updatedFiles);
                return updatedFiles;
            });
            event.target.value = '';
        }
    }

    const handleFileDelete = async (fileName: string) => {
        setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
    };

    const updateProjectFiles = async (files: FileWithId[], url: string) => {
        const newFiles = files.map(file => ({ name: file.name, size: parseFloat((file.size / (1024 * 1024)).toFixed(2)), url: url }));
        console.log(newFiles)
        setTimeout(async () => {
            const { data, error } = await supabaseClient
                .from('proyectos')
                .update({
                    files: newFiles
                })
                .eq('id', projectId)
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

    const handleFileSave = async () => {
        setIsSaving(true);
        const filesToSave = newFiles.filter(file => !completedFiles.includes(file.id));
        const saveFilesPromise = Promise.all(filesToSave.map(async (file: any, index) => {
            return new Promise((resolve, reject) => {
                setTimeout(async () => {
                    setLoadingFileIndex(file.id);
                    setProgress(0);
                    console.log(`Guardando archivo: ${file.name}`);
                    const { data, error } = await supabaseClient.storage.listBuckets()
                    if (error) {
                        console.error('Error al listar los buckets:', error)
                        reject(error);
                    } else {
                        const bucketExists = data.some(bucket => bucket.id === projectId)
                        if (!bucketExists) {
                            const { data, error } = await supabaseClient.storage.createBucket(projectId, {
                                public: true,
                            })
                            if (error) {
                                console.error('Error al crear el bucket:', error)
                                reject(error);
                            } else {
                                console.log('Bucket creado con éxito:', data)
                            }
                        }
                    }
                    const filePath = file.name;
                    console.log(filePath);
                    const { data: uploadData, error: uploadError } = await supabaseClient
                        .storage
                        .from(projectId)
                        .upload(filePath, file)
                    if (uploadError) {
                        console.error('Hubo un error subiendo el archivo:', uploadError);
                        reject(uploadError);
                    } else {
                        const { data, error } = await supabaseClient
                            .storage
                            .from(projectId)
                            .createSignedUrl(uploadData.path, 7889400)
                        console.log(data)
                        const fileUrl = data?.signedUrl || '';
                        console.log('Archivo subido con éxito:', uploadData);
                        if (file.id === filesToSave[filesToSave.length - 1].id) {
                            setIsSaving(false);
                            await updateProjectFiles(filesToSave, fileUrl);
                        }
                        resolve(uploadData);
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
                }, index * 3000);
            });
        }));

        toast.promise(
            saveFilesPromise,
            {
                loading: 'Guardando archivos...',
                success: 'Archivos guardados con éxito',
                error: 'Error al guardar archivos'
            }
        );

        try {
            const results = await saveFilesPromise;
            console.log(results);
        } catch (error) {
            console.error(error);
        }
    }

    const handleQuestions = () => {
        setQuestionsOpen(!questionsOpen);
        isTableFinished(!table);
    }

    const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(event.target.value);
    }

    const handleButtonClick = () => {
        setQuestions(oldQuestions => Array.isArray(oldQuestions) ? [...oldQuestions, inputValue] : [inputValue]);
        setInputValue('');
    }

    const handleQuestionDelete = (index: number) => {
        setQuestions(oldQuestions => oldQuestions.filter((_, i) => i !== index));
    }

    const handleSaveQuestions = async () => {
        const updatePromise = Promise.resolve(
            supabaseClient
                .from('proyectos')
                .update({ questions: questions })
                .eq('id', projectId)
                .single()
                .then()
        );

        toast.promise(
            updatePromise,
            {
                loading: 'Guardando preguntas...',
                success: 'Preguntas guardadas con éxito',
                error: 'Error al guardar preguntas'
            }
        );

        const { data, error } = await updatePromise;
        console.log(data);
        console.log(questions);
    }

    const handleQuestionClick = (question: string) => {
        setSelectedQuestion(question);
    };

    const exportExcel = () => {
        const workbook = utils.book_new();
        let formattedData: ({ Pregunta?: string; Nombre?: string; Respuesta?: string })[] = [];

        Object.keys(tableData).forEach((question) => {
            formattedData.push({ Pregunta: question });
            const data = tableData[question];
            data.forEach((respuesta: { name: string; respuesta: string }) => {
                formattedData.push({
                    Nombre: respuesta.name,
                    Respuesta: respuesta.respuesta
                });
            });
            formattedData.push({});
        });

        const worksheet = utils.json_to_sheet(formattedData, { skipHeader: true });
        utils.book_append_sheet(workbook, worksheet, "Resultados");

        const date = new Date();
        const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        writeFile(workbook, `report_${dateStr}.xlsx`);
    };

    const readExcelFile = async (file: File) => {
        try {
            const rows = await readXlsxFile(file);
            const headers = rows[0].map(String); // Convert each cell to a string
            const dataRows = rows.slice(1);
            const json = headers.reduce((acc: Record<string, any[]>, header: string, index: number) => {
                acc[header] = dataRows.map(row => row[index]);
                return acc;
            }, {});
            console.log(json);
            return json;
        } catch (error) {
            console.error('Hubo un error al leer el archivo Excel:', error);
        }
    };

    const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const file = event.target.files[0];
            const data = await readExcelFile(file);
            if (data && data.Preguntas) {
                setQuestions(data.Preguntas);
            }
        }
    }

    return (

        <div className="w-screen h-auto flex flex-col items-center justify-start">

            <div className="w-full h-14 min-h-[56px] bg-white border-b-1 border-[#89898A] flex flex-row items-center justify-between px-8">

                <Button className="bg-[#1F1F21] min-w-[80px] h-[36px] flex items-center justify-center text-md font-semibold text-[#E7E7E8] rounded-md flex-row gap-1" onClick={() => router.push('/')}> <IconArrowNarrowLeft size={20} /> Regresar</Button>

                <ChatModal />

                <div className="w-auto h-10 flex flex-row items-center justify-end gap-4">

                    <Tooltip content="Copiar URL" className="rounded">
                        <Button className="min-w-[32px] h-auto p-[6px] rounded-lg border-2 border-[#E7E7E8] bg-transparent">
                            <IconLink size={20} className="text-[#1F1F21]" />
                        </Button>
                    </Tooltip>

                    <Divider orientation="vertical" className="bg-[#E7E7E8] w-[2px] h-6" />

                    <Button className="bg-[#1F1F21] min-w-[80px] h-[36px] flex items-center justify-center text-md font-semibold text-[#E7E7E8] rounded-md" onClick={handleStart}>Comenzar</Button>

                    <Divider orientation="vertical" className="bg-[#E7E7E8] w-[2px] h-6" />

                    <Dropdown aria-label='dropdown' classNames={{
                        content: "border border-[#1F1F21] bg-white mt-2",
                    }}
                        className="rounded-md"
                    >
                        <DropdownTrigger>
                            <IconMenu2 size={18} className='text-[#89898A] cursor-pointer hover:text-[#1F1F21]' />
                        </DropdownTrigger>
                        <DropdownMenu aria-label='menu'>
                            <DropdownItem aria-label='files' key='files' startContent={<IconFiles />} className="custom-dropdown-item rounded" onClick={() => handleFiles(projectId)}>Archivos</DropdownItem>
                            <DropdownItem aria-label='questions' key='questions' startContent={<IconQuestionMark />} className="custom-dropdown-item rounded" onClick={() => handleQuestions()}>Preguntas</DropdownItem>
                            <DropdownItem isDisabled={!tableReady} aria-label='table' key='table' startContent={<IconColumns />} className="custom-dropdown-item rounded" onClick={exportExcel}>Descargar Tabla</DropdownItem>
                            <DropdownItem aria-label='access' key='access' startContent={<IconUsersGroup />} className="custom-dropdown-item rounded">Accesos</DropdownItem>
                            <DropdownItem aria-label='delete' key='delete' startContent={<IconTrash />} className="custom-dropdown-item rounded" >Eliminar</DropdownItem>
                        </DropdownMenu>
                    </Dropdown>

                </div>

            </div>

            <ModalInteractive isOpen={isModalOpen} projectName={projectId} onModalData={handleModalData} tipoAnalisis={getTipoAnalisis(project?.type)} />

            {table && Object.keys(tableData).length > 0 && (

                <div className="w-full h-screen flex flex-col items-center justify-start pt-10 pb-[156px] gap-12 px-[80px] max-w-[1440px]" style={{ maxHeight: 'calc(100vh - 56px)' }}>

                    <span className='descriptions id max-w-[800px] h-full min-h-[24px]' style={{ display: '-webkit-box', WebkitLineClamp: '1', WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '24px' }}>
                        {project?.description || 'Cargando Proyecto'}
                    </span>

                    <div className="w-full h-full flex flex-row items-start justify-start gap-5">

                        <div className="border-[#1F1F21] border-2 w-1/4 h-full rounded-lg flex flex-col gap-2 p-2 overflow-hidden">

                            <ScrollShadow hideScrollBar className='flex flex-col gap-2' >

                                {Object.keys(tableData).map((pregunta, index) => (
                                    <div
                                        key={index}
                                        className={`border-2 border-[#1F1F21] w-full h-auto flex flex-row items-center justify-start px-3 py-4 gap-2 rounded-md ${pregunta === selectedQuestion ? 'bg-[#1F1F21]' : 'bg-white'} cursor-pointer`}
                                        onClick={() => handleQuestionClick(pregunta)}
                                    >
                                        <span className={`w-full text-base font-bold cursor-pointer ${pregunta === selectedQuestion ? 'text-white' : 'text-[#1F1F21]'}`}>{pregunta}</span>
                                    </div>
                                ))}

                            </ScrollShadow>

                        </div>

                        <div className="w-3/4 h-full flex flex-row gap-2">

                            <ScrollShadow orientation="horizontal" className="horizontal flex flex-row gap-2" >
                                {selectedQuestion && tableData[selectedQuestion].map((respuesta: any, index: any) => (
                                    <div key={index} className="w-80 min-w-[310px] flex flex-col gap-2 cursor-default">
                                        <div className="w-full h-11 min-h-[44px] rounded-md bg-white flex items-center justify-center">
                                            <span className="text-base font-semibold text-[#1F1F21]">{respuesta.name}</span>
                                        </div>
                                        <div className="w-full h-full rounded-md bg-white flex flex-col items-start justify-start px-4 py-2 gap-2" style={{ maxHeight: 'calc(100vh - 256px)', overflow: 'auto' }}>
                                            <ScrollShadow hideScrollBar>
                                                <span className="text-base font-semibold text-[#1F1F21] overflow-auto pr-2">
                                                    {respuesta.respuesta}
                                                </span>
                                            </ScrollShadow>
                                        </div>
                                    </div>

                                ))}
                            </ScrollShadow>

                        </div>

                    </div>

                </div>

            )}

            <Modal
                isOpen={filesOpen}
                onOpenChange={toggleFilesOpen}
                placement="top-center"
                classNames={{
                    backdrop: "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20"
                }}
                className='border-1 border-[#89898A] min-w-[600px] flex flex-col items-center justify-start gap-6 rounded-lg p-4'
            >
                <ModalContent>
                    {(onClose) => (
                        <>

                            <ModalBody className='w-full p-0'>

                                <div className="flex flex-col items-start justify-start gap-2">

                                    <span className="text-base font-bold text-[#1F1F21]">Archivos</span>
                                    {files?.map((file: FileWithId) => {
                                        return (
                                            <div key={file.name} className={`border-2 rounded-md w-full h-auto max-h-[60px] flex flex-row px-2 py-1.5 items-center border-[#1F1F21]`}>
                                                <div className="w-full flex flex-row items-center justify-start gap-2">
                                                    <IconFileFilled size={24} className="file" />
                                                    <div className="flex flex-col gap-0 p-0 w-full h-auto">
                                                        <span className="text-sm font-semibold" style={{ color: '#1F1F21' }}>{file.name}</span>
                                                        <span className="text-sm font-normal" style={{ color: '#1F1F21' }}>{file.size} MB</span>
                                                    </div>
                                                    {isSaving ? null : <IconBackspaceFilled size={24} className="delete cursor-pointer h-6 text-[#E7E7E8]" onClick={() => handleFileDelete(file.name)} />}
                                                </div>
                                            </div>
                                        );
                                    })}

                                </div>

                                <Divider orientation="horizontal" className="bg-[#E7E7E8] w-full h-[2px]" />

                                <div className="flex flex-col items-start justify-start gap-2">

                                    {newFiles.map((file: FileWithId) => {
                                        return (
                                            <div key={file.id} className={`border-2 rounded-md w-full h-auto max-h-[60px] flex flex-row px-2 py-1.5 items-center border-[#E7E7E8]`}>
                                                <div className="w-full flex flex-row items-center justify-start gap-2">
                                                    {loadingFileIndex === file.id ? <CircularProgress aria-label="progress" className="file" size="sm" color="default" /> : <IconFileFilled size={24} className="file text-[#E7E7E8]" />}
                                                    <div className="flex flex-col gap-0 p-0 w-full h-auto">
                                                        <span className="text-sm font-semibold" style={{ color: '#89898A' }}>{file.name}</span>
                                                        <span className="text-sm font-normal" style={{ color: '#89898A' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                                        {loadingFileIndex === file.id && <Progress aria-label="progress" value={progress} className=" max-h-1 bg-[#E7E7E8] rounded" />}
                                                    </div>
                                                    {isSaving ? null : <IconBackspaceFilled size={24} className="delete cursor-pointer h-6 text-[#E7E7E8]" onClick={() => handleFileDelete(file.name)} />}
                                                </div>
                                            </div>
                                        );
                                    })}

                                </div>

                                <div className="w-full h-auto max-h-[54px] flex flex-row items-center justify-center">
                                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-[48px] border-[#000] rounded-md cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                        <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Haz click para cargar un <strong>PDF</strong></span></p>
                                        <input id="dropzone-file" type="file" onChange={handleFileUpload} className="hidden" accept="application/pdf" ref={fileInputRef} />
                                    </label>
                                </div>

                            </ModalBody>

                            <ModalFooter className='p-0 w-full min-h-[36px]'>
                                <Button className='bg-[#1F1F21] rounded-md w-full min-h-[36px] text-white font-semibold text-base' onClick={handleFileSave}>
                                    Agregar Archivos
                                </Button>
                            </ModalFooter>

                        </>
                    )}
                </ModalContent>
            </Modal>

            {questionsOpen && (

                <div className="w-full max-w-[1280px] h-screen flex flex-row gap-5 items-center justify-center" style={{ maxHeight: 'calc(100vh - 56px)' }}>

                    <div className="border-1 border-[#89898A] w-8/12 h-auto min-h-[556px] max-h-[708px] bg-white rounded-md flex flex-col items-start justify-start gap-4 p-4">

                        <div className="w-full h-auto flex flex-row items-center justify-between">

                            <span className="text-base font-bold text-[#1F1F21] cursor-default">Vista previa de las preguntas del proyecto</span>

                            <div className="w-auto flex flex-row gap-3">

                                <Button className="bg-[#1F1F21] min-w-[80px] h-[36px] flex items-center justify-center text-md font-semibold text-[#E7E7E8] rounded-md flex-row gap-1" onClick={handleSaveQuestions}>Guardar</Button>

                                <label htmlFor="dropzone-excel" className="w-auto px-4 py-2 border-1 border-[#1F1F21] flex flex-col items-center justify-center h-[36px] rounded-md cursor-pointer hover:bg-[#1F1F21] hover:text-[#E7E7E8]">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#E7E7E8]"><span className="font-semibold">Haz click para cargar un <strong className="hover:text-[#E7E7E8]">Excel</strong></span></p>
                                    <input id="dropzone-excel" type="file" onChange={handleExcelUpload} className="hidden" accept=".xlsx, .xls" ref={excelInputRef} />
                                </label>

                            </div>

                        </div>

                        <ScrollShadow hideScrollBar className='w-full flex flex-col gap-2' style={{ maxHeight: 'calc(100vh - 256px)' }}>

                            {questions?.length > 0 && questions.map((question, index) => (
                                <div key={index} className="border-1 border-[#89898A] h-auto w-full flex flex-row items-start justify-between p-3 rounded-md">
                                    <span className=" text-sm font-semibold text-[#1F1F21]">{question}</span>
                                    <IconBackspaceFilled size={18} className="text-[#E7E7E8] hover:text-[#1F1F21] cursor-pointer min-w-[18px]" onClick={() => handleQuestionDelete(index)} />
                                </div>
                            ))}

                        </ScrollShadow>

                    </div>

                    <div className="border-1 border-[#89898A] w-4/12 h-full min-h-[556px] max-h-[556px] bg-white rounded-md flex flex-col items-start justify-start" style={{ maxHeight: 'calc(100vh - 256px)' }}>

                        <div className="w-full h-[52px] min-h-[52px] flex flex-row items-center justify-between p-4">

                            <span className="text-base font-bold text-[#1F1F21]">Agregar preguntas</span>

                            <IconX size={20} onClick={handleQuestions} className="cursor-pointer" />

                        </div>

                        <div className="w-full h-full flex flex-col items-start justify-start gap-4 p-4">

                            <p>{inputValue.split('\n').map((line, index) => (
                                <span key={index}>
                                    {line}
                                    <br />
                                </span>
                            ))}</p>

                        </div>

                        <div className="w-full h-[64px] min-h-[64px] flex flex-row items-center justify-between border-t-1 border-[#89898A] gap-2 pr-3">

                            <textarea className="w-full h-full p-4 rounded-md" value={inputValue} onChange={handleInputChange} />

                            <Button className="w-auto h-auto flex items-center justify-center bg-[#1F1F21] rounded p-2 cursor-pointer" onClick={handleButtonClick}>
                                <IconSend size={20} className="text-[#E7E7E8]" />
                            </Button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}
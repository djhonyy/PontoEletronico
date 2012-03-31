/**
 * Usuario
 *
 * Tratamento de usuarios
 *
 * Licensed under The MIT License
 * Redistributions of files must retain the above copyright notice.
 *
 * @author     Thiago Paes - mrprompt@gmail.com
 * @package    Ponto
 * @subpackage Usuario
 * @filesource usuario.js
 * @copyright  Copyright 2011, Thiago Paes
 * @link       http://github.com/mrprompt/Ponto/
 * @version    $Revision: 0.1 $
 * @license    http://www.opensource.org/licenses/mit-license.php The MIT License
 */
Usuario = {
    /**
     * Crio a sessão do usuário no sessionStorage do navegador (HTML5)
     */
    criaSessao: function(dados) {
        sessionStorage.setItem('dias_trabalho', dados.dias_trabalho);
        sessionStorage.setItem('email', dados.email);
        sessionStorage.setItem('horas_almoco', dados.horas_almoco);
        sessionStorage.setItem('horas_dia', dados.horas_dia);
        sessionStorage.setItem('id', dados.id);
        sessionStorage.setItem('login', dados.login);
        sessionStorage.setItem('nome', dados.nome);
        sessionStorage.setItem('owner', dados.owner);
    },
    
    /**
     * Validação do form de cadastro
     */
    _validaCadastro: function() {
        var bValid = new String();

        if ($('#nome').val().toString().length === 0) {
            bValid += 'Nome inválido.<br>';
        }

        if ($('#usuario').val().toString().length === 0) {
            bValid += 'Login inválido.<br>';
        }

        if ($('#email').val().toString().match(/^[A-Za-z0-9_\-\.]+@[A-Za-z0-9_\-\.]{2,}\.[A-Za-z0-9]{2,}(\.[A-Za-z0-9])?/) === null) {
            bValid += 'E-mail inválido.<br>';
        }

        if ($('input[type=password]').is(':visible')) {
            if ($('#senha').val().toString().length === 0) {
                bValid += 'Senha inválida.<br>';
            }

            if ($('#senha_confirmacao').val() !== $('#senha').val()) {
                bValid += 'Senha e confirmação são diferentes.<br>';
            }
        }

        if ($('#horas_dia').val().toString().match(/^[0-9]+$/) === null) {
            bValid += 'Carga horária inválida.<br>';
        }

        if (bValid && $('#horas_almoco').val().toString().match(/^[0-9]+$/) === null) {
            bValid += 'Intervalo inválido.<br>';
        }

        if (parseInt($('#horas_dia').val()) < parseInt($('#horas_almoco').val())) {
            bValid += 'Você não pode ter um intervalo maior que sua carga horária.<br>';
        }

        return bValid;
    },
    
    /**
     * Troca de sessão, se loga como um usuário subordinado
     */
    _trocaUsuario: function(objUsuario) {
        $('<div/>')
        .attr('id', 'troca-form')
        .html('Você deseja efetuar login como este usuário?')
        .appendTo($('#Ponto'));

        $("#troca-form").dialog({
            title: 'Logar como usuário',
            width: 350,
            modal: true,
            resizable: false,
            buttons: {
                "Continuar": function() {
                    // salvo o estado do usuário inicial
                    if (sessionStorage.getItem('inicial') == null) {
                        sessionStorage.setItem('inicial', JSON.stringify({
                            'id': sessionStorage.getItem('id'),
                            'nome': sessionStorage.getItem('nome'),
                            'login': sessionStorage.getItem('login'),
                            'email': sessionStorage.getItem('email'),
                            'horas_dia': sessionStorage.getItem('horas_dia'),
                            'horas_almoco': sessionStorage.getItem('horas_almoco'),
                            'owner': sessionStorage.getItem('owner')
                        }));
                    }

                    Usuario.criaSessao(objUsuario);
                    Ponto.init();
                },
                "Fechar": function() {
                    $(this).dialog('close');

                    $('#cadastro-form').remove();
                }
            },
            close: function() {
                $("#cadastro-form").remove();
            }
        });
    },
    
    /**
     * Cria o formulário de login
     */
    login: function() {
        $('<div/>')
        .attr('id', 'login-form')
        .appendTo($('#Ponto'));

        var $fieldset = $('<fieldset/>')
        .append($('<label/>')
            .attr('for', 'usuario')
            .html('Usuário')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'usuario')
                .attr('id', 'usuario')
                .addClass('text ui-widget-content ui-corner-all')))
        .append($('<label/>')
            .attr('for', 'senha')
            .html('Senha')
            .append($('<input/>')
                .attr('type', 'password')
                .attr('name', 'senha')
                .attr('id', 'senha')
                .addClass('text ui-widget-content ui-corner-all')));

        $('#login-form').append($('<form/>').append($fieldset)).dialog({
            title: 'Efetuar login',
            width: 250,
            modal: true,
            resizable: false,
            buttons: {
                "Login": function() {
                    var bValid = true;
                        bValid = bValid && $('#usuario').val().length !== 0;
                        bValid = bValid && $('#senha').val().length !== 0;

                    if (bValid === true) {
                        Db.getConnection().transaction(function(tx) {
                            var sql = "SELECT u.id, u.owner, u.login, "
                                    + "p.nome, p.email, p.horas_dia, p.horas_almoco, p.dias_trabalho "
                                    + "FROM usuarios u "
                                    + "JOIN preferencias p "
                                    + "ON u.id = p.usuario_id "
                                    + "WHERE u.login  = ? "
                                    + "AND u.password = ?";

                            var campos = [$('#usuario').val(), $('#senha').val()];

                            tx.executeSql(sql, campos,
                            function(tx, result) {
                                if (result.rows.length > 0) {
                                    Usuario.criaSessao(result.rows.item(0));
                                    Ponto.init();
                                } else {
                                    Ponto._showErro('Login inválido.');
                                }
                            },
                            function(tx, error) {
                                console.log(error);
                            });
                        });
                    } else {
                        Ponto._showErro('Preencha todos os campos');
                    }
                }
            },
            close: function() {
                $('#login-form').remove();

                Usuario.login();
            }
        });
    },

    /**
     * Encerra a sessão do usuário
     */
    logout: function() {
        var mensagem = '';

        // retomar sessão original
        if (sessionStorage.getItem('inicial') !== null) {
            var original = JSON.parse(sessionStorage.getItem('inicial'));
                mensagem = 'Sair do sistema ou apenas \nretornar ao usuário \noriginal?'

            $('<div/>').attr('id', 'troca-form').html(mensagem).appendTo($('#Ponto')).dialog({
                title: 'Logout',
                width: 400,
                modal: true,
                resizable: false,
                buttons: {
                    "Voltar ao estado inicial": function() {
                        // salvo o estado do usuário inicial
                        Usuario.criaSessao(original);

                        sessionStorage.removeItem('inicial');

                        Ponto.init();
                    },
                    "Logout": function() {
                        sessionStorage.clear();

                        Ponto.init();
                    },
                    "Cancelar": function() {
                        $(this).dialog('close');
                    }
                },
                close: function() {
                    $("#troca-form").remove();
                }
            });
        } else {
            sessionStorage.clear();

            Ponto.init();
        }
    },
    
    /**
     * Listagem de usuários cadastrados subordinados ao usuário logado
     */
    listar: function() {
        $('<div/>').addClass('widget-usuarios').appendTo($('#Ponto'));
        
        Db.getConnection().transaction(function(tx) {
            var sql = "SELECT u.id, u.owner, u.login, "
                    + "p.nome, p.email, p.horas_dia, p.horas_almoco, p.dias_trabalho "
                    + "FROM usuarios AS u "
                    + "LEFT JOIN preferencias AS p "
                    + "ON u.id = p.usuario_id "
                    + "WHERE u.owner = ? "
                    + "AND u.id != u.owner "
                    + "ORDER BY p.nome ASC";        

            tx.executeSql(sql, [sessionStorage.getItem('id')],
                function(tx, result) {
                    var results = result.rows.length;

                    if (results > 0) {
                        $('<table/>').attr('id', 'tbUsuarios').appendTo($('.widget-usuarios'));
                        $('<tbody/>').append($('<tr/>').append($('<td/>').addClass('id').html('#'))
                                    .append($('<td/>').addClass('login').html('Login'))
                                    .append($('<td/>').addClass('nome').html('Nome'))
                                    .append($('<td/>').addClass('email').html('E-mail'))
                                    .append($('<td/>').addClass('expediente').html('Expediente'))
                                    .addClass('ui-widget-header'))
                                    .appendTo($('#tbUsuarios'));

                        for (var i = 0; i < results; i++) {
                            var usuario = result.rows.item(i);
                            var $linha  = $('<tr/>').attr('id', 'linha_' + usuario.id).appendTo($('#tbUsuarios tbody'));

                            $linha.append($('<td/>').addClass('id').append($('<input/>').attr('type', 'checkbox').attr('name', 'usuario[]').attr('id', 'usuario_' + usuario.id).val(usuario.id)))
                                  .append($('<td/>').addClass('login').html(usuario.login).click(function() {Usuario.trocaUsuario(usuario);}))
                                  .append($('<td/>').addClass('nome').html(usuario.nome))
                                  .append($('<td/>').addClass('email').html(usuario.email))
                                  .append($('<td/>').addClass('expediente').html(usuario.horas_dia + ' / ' + usuario.horas_almoco));
                        }
                    } else {
                        // sem sub usuários
                        $('<div/>').addClass('noResult').html('Você não possui usuários cadastrados').appendTo($('.widget-usuarios'));                
                    }

                    $('.widget-usuarios').dialog({
                        title: 'Usuários',
                        width: 600,
                        modal: true,
                        resizable: false,
                        buttons: {
                            'Cadastrar Usuário': function() {
                                $('<div/>').attr('id', 'cadastro-form').appendTo($('#Ponto'));

                                var $fieldset = $('<fieldset/>')
                                .append($('<label/>')
                                    .attr('for', 'Nome')
                                    .html('Nome')
                                    .append($('<input/>')
                                        .attr('type', 'text')
                                        .attr('name', 'nome')
                                        .attr('id', 'nome')
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<label/>')
                                    .attr('for', 'usuario')
                                    .html('Login')
                                    .append($('<input/>')
                                        .attr('type', 'text')
                                        .attr('name', 'usuario')
                                        .attr('id', 'usuario')
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<label/>')
                                    .attr('for', 'email')
                                    .html('E-mail')
                                    .append($('<input/>')
                                        .attr('type', 'text')
                                        .attr('name', 'email')
                                        .attr('id', 'email')
                                        .addClass('text ui-widget-content ui-corner-all required email')))
                                .append($('<label/>')
                                    .attr('for', 'senha')
                                    .html('Senha')
                                    .append($('<input/>')
                                        .attr('type', 'password')
                                        .attr('name', 'senha')
                                        .attr('id', 'senha')
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<label/>')
                                    .attr('for', 'senha_confirmacao')
                                    .html('Repita')
                                    .append($('<input/>')
                                        .attr('type', 'password')
                                        .attr('name', 'senha_confirmacao')
                                        .attr('id', 'senha_confirmacao')
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<label/>')
                                    .attr('for', 'horas_dia')
                                    .html('Carga horária')
                                    .append($('<input/>')
                                        .attr('type', 'text')
                                        .attr('name', 'horas_dia')
                                        .attr('id', 'horas_dia')
                                        .attr('maxlength', '2')
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<label/>')
                                    .attr('for', 'horas_almoco')
                                    .html('Intervalo')
                                    .append($('<input/>')
                                        .attr('type', 'text')
                                        .attr('name', 'horas_almoco')
                                        .attr('id', 'horas_almoco')
                                        .attr('maxlength', '2')
                                        .addClass('text ui-widget-content ui-corner-all required')))
                                .append($('<fieldset/>')
                                    .append($('<legend/>')
                                        .html('Dias de Trabalho'))
                                    .addClass('diasTrabalho')
                                    .append($('<label/>')
                                        .html('Dom')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_0')
                                            .val('0')))
                                    .append($('<label/>')
                                        .html('Seg')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_1')
                                            .attr('checked', true)
                                            .val('1')))
                                    .append($('<label/>')
                                        .html('Ter')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_2')
                                            .attr('checked', true)
                                            .val('2')))
                                    .append($('<label/>')
                                        .html('Qua')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_3')
                                            .attr('checked', true)
                                            .val('3')))
                                    .append($('<label/>')
                                        .html('Qui')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_4')
                                            .attr('checked', true)
                                            .val('4')))
                                    .append($('<label/>')
                                        .html('Sex')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_5')
                                            .attr('checked', true)
                                            .val('5')))
                                    .append($('<label/>')
                                        .html('Sáb')
                                        .append($('<input/>')
                                            .attr('type', 'checkbox')
                                            .attr('name', 'dias_trabalho[]')
                                            .attr('id', 'dias_trabalho_6')
                                            .val('6'))))
                                .append($('<input/>')
                                    .attr('type', 'hidden')
                                    .attr('name', 'owner')
                                    .attr('id', 'owner'))
                                .append($('<input/>')
                                    .attr('type', 'hidden')
                                    .attr('name', 'id')
                                    .attr('id', 'id'));

                                var $form = $('<form/>')
                                    .attr('id', 'frmCadastro')
                                    .append($fieldset);
            
                                $('#cadastro-form').append($form);
                                $('#cadastro-form form #owner').val(sessionStorage.id);
                                $("#cadastro-form").dialog({
                                    title: 'Cadastro',
                                    width: 250,
                                    modal: true,
                                    resizable: false,
                                    buttons: {
                                        "Cadastrar": function() {
                                            var bValid = Usuario._validaCadastro();

                                            if (bValid.length === 0) {
                                                // procuro se já existe algum usuário com o login
                                                Db.getConnection().transaction(function(tx) {
                                                    var sql = "SELECT COUNT(id) AS total "
                                                            + "FROM usuarios "
                                                            + "WHERE login = ? "
                                                            + "LIMIT 1";

                                                    tx.executeSql(sql, [$('#cadastro-form form #usuario').val()],
                                                    function(tx, result) {
                                                        if (result.rows.item(0).total == 0) {
                                                            Db.getConnection().transaction(function(tx) {
                                                                var sql = "INSERT OR REPLACE INTO usuarios (owner, login, password) "
                                                                        + "VALUES (?, ?, ?)";

                                                                tx.executeSql(sql, [$('#cadastro-form form #owner').val(), $('#cadastro-form form #usuario').val(), $('#cadastro-form form #senha').val()],
                                                                function(tx, result) {
                                                                    if (result.rowsAffected == 1) {
                                                                        // crio as preferencias
                                                                        Db.getConnection().transaction(function(tx) {
                                                                            sql = "INSERT OR REPLACE INTO preferencias (usuario_id, horas_dia, horas_almoco, email, nome, dias_trabalho) "
                                                                                + "VALUES (?, ?, ?, ?, ?, ?)";

                                                                            var $selecionados = $('#cadastro-form form input:checkbox:checked');
                                                                            var $lista = new Array();

                                                                            $selecionados.each(function(i) {
                                                                                $lista[i] = $(this).val();
                                                                            });
                                                                            
                                                                            tx.executeSql(sql, [result.insertId, $('#cadastro-form form #horas_dia').val(), $('#cadastro-form form #horas_almoco').val(), $('#cadastro-form form #email').val(), $('#cadastro-form form #nome').val(), $lista.join(',')],
                                                                            function(tx, result) {
                                                                                if (result.rowsAffected == 1) {
                                                                                    $(this).dialog('close');
                                                                                    
                                                                                    Ponto.init();
                                                                                    Usuario.listar();
                                                                                }
                                                                            });
                                                                        });
                                                                    } else {
                                                                        Ponto._showErro('Nome de usuário já em uso, tente outro.');
                                                                    }
                                                                },
                                                                function(tx, error) {
                                                                    console.log(error);
                                                                });
                                                            });   
                                                        } else {
                                                            Ponto._showErro('Nome de usuário já em uso, tente outro.');
                                                        }
                                                    },
                                                    function(tx, error) {
                                                        console.log(error);
                                                    });
                                                });                                                

                                            } else {
                                                Ponto._showErro(bValid);
                                            }
                                        },
                                        "Fechar": function() {
                                            $(this).dialog('close');

                                            $('#cadastro-form').remove();
                                        }
                                    },
                                    close: function() {
                                        $("#cadastro-form").remove();
                                    }
                                });
                            },
                            'Remover selecionados': function() {
                                var $selecionados = $('#tbUsuarios input:checkbox:checked');
                                var $lista = new Array();

                                $selecionados.each(function(i) {
                                    $lista[i] = $(this).val();
                                });

                                if ($lista.length !== 0) {
                                    var $msg = 'Remover permanentemente o(s) usuário(s) '
                                            + 'selecionado(s)? <br>'
                                            + 'Todos os dados relacionados a este usuário '
                                            + 'serão removidos de forma irreversível.';

                                    $('<div/>')
                                    .attr('id', 'apagar-form')
                                    .html($msg)
                                    .appendTo($('#Ponto'))
                                    .dialog({
                                        title: 'Remover usuários',
                                        width: 400,
                                        modal: true,
                                        resizable: false,
                                        buttons: {
                                            "Continuar": function() {
                                                $(this).dialog('close');

                                                $($lista).each(function(i, e) {
                                                    Db.getConnection().transaction(function(tx) {
                                                        var sql = "DELETE FROM usuarios WHERE id = ?";
                                                        
                                                        tx.executeSql(sql, [e],
                                                        function(tx, result) {
                                                            $('#tbUsuarios tbody #linha_' + e).hide();
                                                        },
                                                        function(tx, error) {
                                                            throw error;
                                                        });
                                                    });
                                                });
                                            },
                                            "Fechar": function() {
                                                $(this).dialog('close');

                                                $('#apagar-form').remove();
                                            }
                                        },
                                        close: function() {
                                            $("#apagar-form").remove();
                                        }
                                    });
                                } else {
                                    $('<div/>')
                                    .attr('id', 'apagar-form')
                                    .html('Selecione algum usuário.')
                                    .appendTo($('#Ponto'))
                                    .dialog({
                                        title: 'Remover usuários',
                                        width: 400,
                                        modal: true,
                                        resizable: false,
                                        buttons: {
                                            "Fechar": function() {
                                                $(this).dialog('close');

                                                $('#apagar-form').remove();
                                            }
                                        },
                                        close: function() {
                                            $("#apagar-form").remove();
                                        }
                                    });
                                }
                            },
                            "Fechar": function() {
                                $(this).dialog('close');

                                $(".widget-usuarios").remove();
                            }
                        },
                        close: function() {
                            $(".widget-usuarios").remove();
                        }
                    });            
                },
                function(tx, error) {
                    console.log(error);
                });
        });
    },
    
    /**
     * Configurações do usuário
     */
    preferencias: function() {
        $('<div/>').attr('id', 'cadastro-form').addClass('widget-preferencias').appendTo($('#Ponto'));

        var $fieldset = $('<fieldset/>')
        .append($('<label/>')
            .attr('for', 'Nome')
            .html('Nome')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'nome')
                .attr('id', 'nome')
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<label/>')
            .attr('for', 'usuario')
            .html('Login')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'usuario')
                .attr('id', 'usuario')
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<label/>')
            .attr('for', 'email')
            .html('E-mail')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'email')
                .attr('id', 'email')
                .addClass('text ui-widget-content ui-corner-all required email')))
        .append($('<label/>')
            .attr('for', 'senha')
            .html('Senha')
            .append($('<input/>')
                .attr('type', 'password')
                .attr('name', 'senha')
                .attr('id', 'senha')
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<label/>')
            .attr('for', 'senha_confirmacao')
            .html('Repita')
            .append($('<input/>')
                .attr('type', 'password')
                .attr('name', 'senha_confirmacao')
                .attr('id', 'senha_confirmacao')
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<label/>')
            .attr('for', 'horas_dia')
            .html('Carga horária')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'horas_dia')
                .attr('id', 'horas_dia')
                .attr('maxlength', '2')
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<label/>')
            .attr('for', 'horas_almoco')
            .html('Intervalo')
            .append($('<input/>')
                .attr('type', 'text')
                .attr('name', 'horas_almoco')
                .attr('id', 'horas_almoco')
                .attr('maxlength', '2')
                .addClass('text ui-widget-content ui-corner-all required')))
        .append($('<fieldset/>')
            .append($('<legend/>')
                .html('Dias de Trabalho'))
            .addClass('diasTrabalho')
            .append($('<label/>')
                .html('Dom')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_0')
                    .val('0')))
            .append($('<label/>')
                .html('Seg')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_1')
                    .attr('checked', true)
                    .val('1')))
            .append($('<label/>')
                .html('Ter')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_2')
                    .attr('checked', true)
                    .val('2')))
            .append($('<label/>')
                .html('Qua')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_3')
                    .attr('checked', true)
                    .val('3')))
            .append($('<label/>')
                .html('Qui')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_4')
                    .attr('checked', true)
                    .val('4')))
            .append($('<label/>')
                .html('Sex')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_5')
                    .attr('checked', true)
                    .val('5')))
            .append($('<label/>')
                .html('Sáb')
                .append($('<input/>')
                    .attr('type', 'checkbox')
                    .attr('name', 'dias_trabalho[]')
                    .attr('id', 'dias_trabalho_6')
                    .val('6'))))
        .append($('<input/>')
            .attr('type', 'hidden')
            .attr('name', 'owner')
            .attr('id', 'owner'))
        .append($('<input/>')
            .attr('type', 'hidden')
            .attr('name', 'id')
            .attr('id', 'id'));

        $('#cadastro-form').append($('<form/>').attr('id', 'frmCadastro').append($fieldset));

        // preencho o formulário
        $('#cadastro-form form #nome').val(sessionStorage.getItem('nome'));
        $('#cadastro-form form #email').val(sessionStorage.getItem('email'));
        $('#cadastro-form form #usuario').val(sessionStorage.getItem('login')).attr('readonly', 'readonly');
        $('#cadastro-form form #id').val(sessionStorage.getItem('id'));
        $('#cadastro-form form #owner').val(sessionStorage.getItem('owner'));
        $('#cadastro-form form #horas_dia').val(sessionStorage.getItem('horas_dia'));
        $('#cadastro-form form #horas_almoco').val(sessionStorage.getItem('horas_almoco'));

        $('#cadastro-form form input#usuario').hide();
        $('#cadastro-form form input#usuario').parent().hide();

        $('#cadastro-form form input[type=password]').hide();
        $('#cadastro-form form input[type=password]').parent().hide();

        // marco os dias da semana que são trabalhados
        var $dias = sessionStorage.getItem('dias_trabalho').split(',');

        $('#cadastro-form form input[type=checkbox]').attr('checked', false);

        for (var i in $dias) {
            $('#cadastro-form form #dias_trabalho_' + $dias[i]).attr('checked', true);
        }
        
        $("#cadastro-form").dialog({
            title: 'Preferências',
            width: 320,
            modal: true,
            resizable: false,
            buttons: {
                "Atualizar": function() {
                    var bValid = Usuario._validaCadastro();

                    if (bValid.length === 0) {
                        // troco a senha
                        if ($('#cadastro-form form #senha').val().length >= 4) {
                            Db.getConnection().transaction(function(tx) {
                                var sql = "UPDATE usuarios SET password = ? WHERE id = ?";

                                tx.executeSql(sql, [$('#cadastro-form form #senha').val(), sessionStorage.getItem('id')]);
                            });
                        }
                        
                        Db.getConnection().transaction(function(tx) {
                            var sql = "INSERT OR REPLACE INTO preferencias (usuario_id, horas_dia, horas_almoco, email, nome, dias_trabalho) "
                                    + "VALUES (?, ?, ?, ?, ?, ?)";

                            var $selecionados = $('#cadastro-form form input:checkbox:checked');
                            var $lista = new Array();

                            $selecionados.each(function(i) {
                                $lista[i] = $(this).val();
                            });

                            tx.executeSql(sql, [sessionStorage.getItem('id'), $('#cadastro-form form #horas_dia').val(), $('#cadastro-form form #horas_almoco').val(), $('#cadastro-form form #email').val(), $('#cadastro-form form #nome').val(), $lista.join(',')],
                            function(tx, result) {
                                if (result.rowsAffected == 1) {
                                    $(this).dialog('close');

                                    sessionStorage.setItem('email', $('#cadastro-form form #email').val());
                                    sessionStorage.setItem('nome', $('#cadastro-form form #nome').val());
                                    sessionStorage.setItem('horas_almoco', $('#cadastro-form form #horas_almoco').val());
                                    sessionStorage.setItem('horas_dia', $('#cadastro-form form #horas_dia').val());
                                    sessionStorage.setItem('dias_trabalho', $lista.join(','));

                                    Ponto.init();
                                }
                            });
                        });
                    } else {
                        Ponto._showErro(bValid);
                    }
                },
                "Trocar Senha": function() {
                    $('#cadastro-form form input[type=password]').toggle();
                    $('#cadastro-form form input[type=password]').parent().toggle();
                },
                "Fechar": function() {
                    $(this).dialog('close');

                    $('#cadastro-form').remove();
                }
            },
            close: function() {
                $("#cadastro-form").remove();
            }
        });
    }
}
'use strict';
const _             = require('lodash');
const bbPromise     = require('bluebird');
const defaults      = require('../config/defaults');
const sequelize     = require('sequelize');
const Op            = sequelize.Op;

module.exports = function (sequelize, DataTypes) {

    const BlogPost = sequelize.define('BlogPost', {

        id: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        key: {
            type: DataTypes.STRING(100),
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING(1000),
            allowNull: false,
        },
        preDetail: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'pre_detail'
        },
        videoUrl: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field    : 'video_url'
        },
        postDetail: {
            type: DataTypes.TEXT,
            allowNull: false,
            field: 'post_detail'
        },
        active: {
            type: DataTypes.INTEGER(1),
            allowNull: false,
        },
        addedBy: {
            type: DataTypes.INTEGER(11),
            allowNull: false,
            field: 'added_by'
        },
        updatedBy: {
            type: DataTypes.INTEGER(11),
            field: 'updated_by'
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'updated_at'
        }
    }, {

        tableName: 'blog_posts'
    });

    BlogPost.associate = function (models) {

        BlogPost.belongsTo(models.User, {foreignKey: 'addedBy', as: 'AddedBy'});
        BlogPost.belongsTo(models.User, {foreignKey: 'updatedBy', as: 'UpeatedBy'});

        BlogPost.hasMany(models.Attachment, {foreignKey: 'againstId', scope: { against_type: ['blog'] }});
        BlogPost.hasMany(models.BlogPostLike, {foreignKey: 'blogId'});
        BlogPost.hasMany(models.Comment, {foreignKey: 'againstId', scope: { against_type: ['blog'] }});
        BlogPost.hasMany(models.TagsBlogPostsMapping, {foreignKey: 'blogId'});

    };

    BlogPost.CONSTANTS = {
        ACTIVE: {
            YES: true,
            NO: false,
        }
    }

    BlogPost.getBlogPosts = (params) => {

        let options = {};
        options.subQuery = false;
        options.where = BlogPost.getRawParams(params);
        if(options.where.title) {
            options.where.title = { [Op.like]: '%'+ options.where.title +'%' };
        }
        if(!params.hasOwnProperty('active')) {
            options.where.active = BlogPost.CONSTANTS.ACTIVE.YES
        }
        options.include = [
            {
                model : sequelize.models.User,
                as: 'AddedBy',
                attributes: ['firstName'],
                required: true
            }
            
        ];
        BlogPost.appendIncludeStatements(options.include, params, true);
        let countPromise = BlogPost.find({
            attributes: [ [ sequelize.literal('count(*)'), 'count' ] ],
            subQuery: false,
            include: _.clone(options.include),
            raw: true,
            where: _.clone(options.where)
        });
        options.attributes = { exclude: ['active', 'updatedBy', 'updatedAt'] };
        let limitOptions = BlogPost.setPagination(params);
        if(limitOptions.limit) {
            options.limit = limitOptions.limit
        }
        if(limitOptions.offset || limitOptions.offset == 0) {
            options.offset = limitOptions.offset
        }

        BlogPost.appendIncludeStatements(options.include, params);
        options.order = [['id', defaults.sortOrder.DESC]];
        let dataPromise = BlogPost.findAll(options);
        return {
            dataPromise: dataPromise,
            countPromise: countPromise
        }

    }

    BlogPost.appendIncludeStatements = (options, params, onlyMandatory = false) => {
        if(!onlyMandatory) {
            options.push({
                model : sequelize.models.Comment,
                attributes: { exclude: ['active', 'againstType', 'status'] },
                where: {
                    active: sequelize.models.Comment.CONSTANTS.ACTIVE.YES,
                    againstType: sequelize.models.Comment.CONSTANTS.AGAINST_TYPE.BLOG,
                    status: sequelize.models.Comment.CONSTANTS.STATUS.APPROVED
                },
                required: false,
                include: [
                    {
                        model : sequelize.models.Comment,
                        as: 'CommentsAgainstComment',
                        attributes: { exclude: ['active', 'againstType', 'status'] },
                        include: [
                            {
                                model : sequelize.models.User,
                                as: 'AddedBy',
                                attributes: ['firstName'],
                                required: false,
                            }
                        ],
                        required: false,
                        where: {
                            active: sequelize.models.Comment.CONSTANTS.ACTIVE.YES,
                            status: sequelize.models.Comment.CONSTANTS.STATUS.APPROVED
                        },
                    },
                    {
                        model : sequelize.models.User,
                        as: 'AddedBy',
                        attributes: ['firstName'],
                        required: false,
                    }
                ]
            });
            options.push({
                model : sequelize.models.Attachment,
                attributes: { exclude: ['against_type', 'type', 'active', 'updatedBy', 'updatedAt'] },
                where: {
                    active: sequelize.models.Attachment.CONSTANTS.ACTIVE.YES,
                    againstType: sequelize.models.Attachment.CONSTANTS.AGAINST_TYPE.BLOG,
                    type: sequelize.models.Attachment.CONSTANTS.TYPE.IMAGE
                },
                required: false
            });
            options.push({
                model : sequelize.models.BlogPostLike,
                attributes: ['id'],
            });
        }
        let TagsBlogPostsMappingWhereClause = {
            active: sequelize.models.TagsBlogPostsMapping.CONSTANTS.ACTIVE.YES
        };
        let TagsBlogPostsMappingRequired = false;
        if(params.tagIds) {
            TagsBlogPostsMappingRequired = true;
            TagsBlogPostsMappingWhereClause.tagId = params.tagIds.split(',');
        }

        if(onlyMandatory == TagsBlogPostsMappingRequired) {
            options.push({
                model : sequelize.models.TagsBlogPostsMapping,
                attributes: ['tagId'],
                required: TagsBlogPostsMappingRequired,
                where: TagsBlogPostsMappingWhereClause,
                include: [
                    {
                        model : sequelize.models.Tag,
                        attributes: ['title'],
                        where: {
                            active: sequelize.models.Tag.CONSTANTS.ACTIVE.YES
                        },
                    }
                ]
            });
        }
    }

    BlogPost.createBlogPost = async (params) => {
        let createBlogPostResult = await BlogPost.create(BlogPost.getRawParams(params));
        let extraBlogPostEnteriesPromises = [];
        if(params.tagIds) {
            let tagMappingParams = {
                blogId: createBlogPostResult.id,
                tagIds: params.tagIds.split(',')
            };

            extraBlogPostEnteriesPromises = sequelize.models.TagsBlogPostsMapping.createBlogPostAndTagIdsRelation(tagMappingParams);
        }

        if(params.uploadedImageName) {
            extraBlogPostEnteriesPromises.push(sequelize.models.Attachment.create({
                key: params.uploadedImageName,
                title: params.uploadedImageName,
                path: params.uploadedImageName,
                type: sequelize.models.Attachment.CONSTANTS.TYPE.IMAGE,
                againstType: sequelize.models.Attachment.CONSTANTS.AGAINST_TYPE.BLOG,
                againstId: createBlogPostResult.id,
                active: sequelize.models.Attachment.CONSTANTS.ACTIVE.YES,
                addedBy: params.addedBy,
                updatedBy: params.updatedBy,
            }));
        }

        bbPromise.all(extraBlogPostEnteriesPromises);

        return createBlogPostResult;
    }
        

    return BlogPost;
}
